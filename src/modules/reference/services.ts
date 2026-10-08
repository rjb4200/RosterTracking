import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  credentialTypes,
  curricula,
  curriculumChapters,
  studentAgencies,
  studentCredentials,
  students,
  trainingCodes,
  trainingSites,
} from "@/server/db/schema";
import {
  credentialLookupHash,
  encryptCredential,
  normalizeCredentialValue,
} from "./crypto";
import { credentialMaskedSuffix, normalizePhone } from "./masking";

export interface Actor {
  id: string;
  username: string;
}

export function shouldClearExistingPrimary(input: {
  isPrimary: boolean;
  isActive: boolean;
}): boolean {
  return input.isPrimary && input.isActive;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  if ("cause" in error) {
    return postgresErrorCode((error as { cause?: unknown }).cause);
  }
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23505";
}

const studentInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  studentNumber: z.string().trim().max(50).optional().or(z.literal("")),
});

const agencyInput = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(50).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
});

const credentialInput = z.object({
  value: z.string().trim().min(1).max(200),
  expirationDate: z.string().trim().max(20).optional().or(z.literal("")),
});

const siteInput = z.object({
  name: z.string().trim().min(1).max(300),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(50).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
});

const trainingCodeInput = z.object({
  code: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  sourceRevision: z.string().trim().min(1).max(50),
});

function nullable(value: string): string | null {
  return value === "" ? null : value;
}

// ── Students ──────────────────────────────────────────────────────────────

export async function listStudents(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(students)
    .where(
      and(
        eq(students.isActive, true),
        or(
          ilike(students.lastName, term),
          ilike(students.firstName, term),
          ilike(students.phone, term),
          ilike(students.studentNumber, term),
        ),
      ),
    )
    .orderBy(students.lastName, students.firstName)
    .limit(100);
}

export async function getStudent(db: Database, id: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  if (!student) return null;

  const [memberships, credentials] = await Promise.all([
    db
      .select({
        studentAgencyId: studentAgencies.agencyId,
        agencyId: agencies.id,
        agencyName: agencies.name,
        isPrimary: studentAgencies.isPrimary,
        isActive: studentAgencies.isActive,
      })
      .from(studentAgencies)
      .innerJoin(agencies, eq(agencies.id, studentAgencies.agencyId))
      .where(eq(studentAgencies.studentId, id))
      .orderBy(studentAgencies.isPrimary, agencies.name),
    db
      .select({
        id: studentCredentials.id,
        credentialTypeId: credentialTypes.id,
        credentialTypeCode: credentialTypes.code,
        credentialTypeName: credentialTypes.name,
        maskedSuffix: studentCredentials.maskedSuffix,
        expirationDate: studentCredentials.expirationDate,
      })
      .from(studentCredentials)
      .innerJoin(
        credentialTypes,
        eq(credentialTypes.id, studentCredentials.credentialTypeId),
      )
      .where(eq(studentCredentials.studentId, id))
      .orderBy(credentialTypes.name),
  ]);

  return { ...student, memberships, credentials };
}

export async function createStudent(
  db: Database,
  actor: Actor,
  input: z.infer<typeof studentInput>,
) {
  const parsed = studentInput.parse(input);
  const phone = normalizePhone(parsed.phone);
  return db.transaction(async (transaction) => {
    try {
      const [student] = await transaction
        .insert(students)
        .values({
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone,
          email: nullable(parsed.email ?? ""),
          studentNumber: nullable(parsed.studentNumber ?? ""),
        })
        .returning();
      if (!student) throw new Error("Student was not created.");
      await writeStudentAudit(
        transaction,
        actor,
        "student.created",
        student.id,
        {
          firstName: student.firstName,
          lastName: student.lastName,
        },
      );
      return student;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("A student with that phone number already exists.");
      }
      throw error;
    }
  });
}

export async function updateStudent(
  db: Database,
  actor: Actor,
  id: string,
  input: z.infer<typeof studentInput>,
) {
  const parsed = studentInput.parse(input);
  const phone = normalizePhone(parsed.phone);
  return db.transaction(async (transaction) => {
    try {
      const [student] = await transaction
        .update(students)
        .set({
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone,
          email: nullable(parsed.email ?? ""),
          studentNumber: nullable(parsed.studentNumber ?? ""),
          updatedAt: new Date(),
        })
        .where(eq(students.id, id))
        .returning();
      if (!student) throw new Error("Student not found.");
      await writeStudentAudit(transaction, actor, "student.updated", id, {
        firstName: student.firstName,
        lastName: student.lastName,
      });
      return student;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("A student with that phone number already exists.");
      }
      throw error;
    }
  });
}

export async function setStudentActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [student] = await transaction
      .update(students)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    if (!student) throw new Error("Student not found.");
    await writeStudentAudit(
      transaction,
      actor,
      isActive ? "student.activated" : "student.deactivated",
      id,
    );
    return student;
  });
}

async function writeStudentAudit(
  transaction: DatabaseTransaction,
  actor: Actor,
  action: string,
  studentId: string,
  details?: Record<string, unknown>,
) {
  await writeAuditLog(transaction, {
    actorUserId: actor.id,
    actorType: "user",
    action,
    entityType: "student",
    entityId: studentId,
    details,
  });
}

// ── Student agencies ──────────────────────────────────────────────────────

export async function setStudentMembership(
  db: Database,
  actor: Actor,
  studentId: string,
  agencyId: string,
  input: { isPrimary: boolean; isActive: boolean },
) {
  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(studentAgencies)
      .where(
        and(
          eq(studentAgencies.studentId, studentId),
          eq(studentAgencies.agencyId, agencyId),
        ),
      )
      .limit(1);

    if (shouldClearExistingPrimary(input)) {
      await transaction
        .update(studentAgencies)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(studentAgencies.studentId, studentId),
            eq(studentAgencies.isPrimary, true),
          ),
        );
    }

    if (existing) {
      await transaction
        .update(studentAgencies)
        .set({
          isPrimary: input.isPrimary,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studentAgencies.studentId, studentId),
            eq(studentAgencies.agencyId, agencyId),
          ),
        );
    } else {
      await transaction.insert(studentAgencies).values({
        studentId,
        agencyId,
        isPrimary: input.isPrimary,
        isActive: input.isActive,
      });
    }

    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "student.membership.changed",
      entityType: "student",
      entityId: studentId,
      details: {
        agencyId,
        isPrimary: input.isPrimary,
        isActive: input.isActive,
      },
    });
  });
}

// ── Agencies ──────────────────────────────────────────────────────────────

export async function listAgencies(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(agencies)
    .where(and(isNull(agencies.archivedAt), ilike(agencies.name, term)))
    .orderBy(agencies.name)
    .limit(100);
}

export async function getAgency(db: Database, id: string) {
  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, id))
    .limit(1);
  return agency ?? null;
}

export async function createAgency(
  db: Database,
  actor: Actor,
  input: z.infer<typeof agencyInput>,
) {
  const parsed = agencyInput.parse(input);
  const details = {
    name: parsed.name,
    type: nullable(parsed.type ?? ""),
    address: nullable(parsed.address ?? ""),
    city: nullable(parsed.city ?? ""),
    state: nullable(parsed.state ?? ""),
    zip: nullable(parsed.zip ?? ""),
    contactName: nullable(parsed.contactName ?? ""),
    phone: nullable(parsed.phone ?? ""),
    email: nullable(parsed.email ?? ""),
  };
  return db.transaction(async (transaction) => {
    // An agency name is unique, so re-adding an archived or inactive agency
    // revives or reactivates it instead of failing as a duplicate.
    const [existing] = await transaction
      .select()
      .from(agencies)
      .where(sql`lower(btrim(${agencies.name})) = lower(btrim(${parsed.name}))`)
      .limit(1);
    if (existing && (existing.archivedAt || !existing.isActive)) {
      const [agency] = await transaction
        .update(agencies)
        .set({
          ...details,
          isActive: true,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(agencies.id, existing.id))
        .returning();
      if (!agency) throw new Error("Agency was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: existing.archivedAt ? "agency.revived" : "agency.reactivated",
        entityType: "agency",
        entityId: agency.id,
        details: { name: agency.name },
      });
      return agency;
    }
    try {
      const [agency] = await transaction
        .insert(agencies)
        .values(details)
        .returning();
      if (!agency) throw new Error("Agency was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "agency.created",
        entityType: "agency",
        entityId: agency.id,
        details: { name: agency.name },
      });
      return agency;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("An agency with that name already exists.");
      }
      throw error;
    }
  });
}

export async function updateAgency(
  db: Database,
  actor: Actor,
  id: string,
  input: z.infer<typeof agencyInput>,
) {
  const parsed = agencyInput.parse(input);
  return db.transaction(async (transaction) => {
    const [agency] = await transaction
      .update(agencies)
      .set({
        name: parsed.name,
        type: nullable(parsed.type ?? ""),
        address: nullable(parsed.address ?? ""),
        city: nullable(parsed.city ?? ""),
        state: nullable(parsed.state ?? ""),
        zip: nullable(parsed.zip ?? ""),
        contactName: nullable(parsed.contactName ?? ""),
        phone: nullable(parsed.phone ?? ""),
        email: nullable(parsed.email ?? ""),
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, id))
      .returning();
    if (!agency) throw new Error("Agency not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "agency.updated",
      entityType: "agency",
      entityId: agency.id,
      details: { name: agency.name },
    });
    return agency;
  });
}

export async function setAgencyActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [agency] = await transaction
      .update(agencies)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(agencies.id, id))
      .returning();
    if (!agency) throw new Error("Agency not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive ? "agency.activated" : "agency.deactivated",
      entityType: "agency",
      entityId: agency.id,
    });
    return agency;
  });
}

export async function archiveAgency(db: Database, actor: Actor, id: string) {
  return db.transaction(async (transaction) => {
    const [agency] = await transaction
      .update(agencies)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(agencies.id, id))
      .returning();
    if (!agency) throw new Error("Agency not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "agency.archived",
      entityType: "agency",
      entityId: agency.id,
    });
    return agency;
  });
}

// ── Credentials ───────────────────────────────────────────────────────────

export async function listCredentialTypes(db: Database) {
  return db
    .select()
    .from(credentialTypes)
    .where(eq(credentialTypes.isActive, true))
    .orderBy(credentialTypes.name);
}

export async function upsertStudentCredential(
  db: Database,
  actor: Actor,
  studentId: string,
  credentialTypeId: string,
  input: z.infer<typeof credentialInput>,
) {
  const parsed = credentialInput.parse(input);
  const normalizedValue = normalizeCredentialValue(parsed.value);
  const maskedSuffix = credentialMaskedSuffix(normalizedValue);
  const valueHash = credentialLookupHash(normalizedValue);
  const encryptedValue = encryptCredential(normalizedValue);
  const expirationDate = parsed.expirationDate ? parsed.expirationDate : null;

  return db.transaction(async (transaction) => {
    const existing = await transaction
      .select()
      .from(studentCredentials)
      .where(
        and(
          eq(studentCredentials.studentId, studentId),
          eq(studentCredentials.credentialTypeId, credentialTypeId),
        ),
      )
      .limit(1);

    let credentialId: string;
    try {
      if (existing[0]) {
        credentialId = existing[0].id;
        await transaction
          .update(studentCredentials)
          .set({
            value: encryptedValue,
            valueHash,
            maskedSuffix,
            expirationDate,
            updatedAt: new Date(),
          })
          .where(eq(studentCredentials.id, credentialId));
      } else {
        const [created] = await transaction
          .insert(studentCredentials)
          .values({
            studentId,
            credentialTypeId,
            value: encryptedValue,
            valueHash,
            maskedSuffix,
            expirationDate,
          })
          .returning({ id: studentCredentials.id });
        if (!created) throw new Error("Credential was not created.");
        credentialId = created.id;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("This credential number is already in use.");
      }
      throw error;
    }

    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "student.credential.changed",
      entityType: "student",
      entityId: studentId,
      details: { credentialTypeId, maskedSuffix },
    });

    return credentialId;
  });
}

// ── Training codes and sites ──────────────────────────────────────────────

export async function listTrainingCodes(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(trainingCodes)
    .where(
      and(
        isNull(trainingCodes.archivedAt),
        or(ilike(trainingCodes.code, term), ilike(trainingCodes.title, term)),
      ),
    )
    .orderBy(trainingCodes.code)
    .limit(100);
}

export async function getTrainingCode(db: Database, id: string) {
  const [code] = await db
    .select()
    .from(trainingCodes)
    .where(eq(trainingCodes.id, id))
    .limit(1);
  return code ?? null;
}

export async function listSites(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(trainingSites)
    .where(
      and(isNull(trainingSites.archivedAt), ilike(trainingSites.name, term)),
    )
    .orderBy(trainingSites.name)
    .limit(100);
}

export async function getSite(db: Database, id: string) {
  const [site] = await db
    .select()
    .from(trainingSites)
    .where(eq(trainingSites.id, id))
    .limit(1);
  return site ?? null;
}

export async function createSite(
  db: Database,
  actor: Actor,
  input: z.infer<typeof siteInput>,
) {
  const parsed = siteInput.parse(input);
  const details = {
    name: parsed.name,
    address: nullable(parsed.address ?? ""),
    city: nullable(parsed.city ?? ""),
    state: nullable(parsed.state ?? ""),
    zip: nullable(parsed.zip ?? ""),
  };
  return db.transaction(async (transaction) => {
    // Re-adding an archived or inactive site with the same name revives or
    // reactivates the most recent one instead of creating another copy.
    const [existing] = await transaction
      .select()
      .from(trainingSites)
      .where(
        and(
          sql`lower(btrim(${trainingSites.name})) = lower(btrim(${parsed.name}))`,
          or(
            isNotNull(trainingSites.archivedAt),
            eq(trainingSites.isActive, false),
          ),
        ),
      )
      .orderBy(desc(trainingSites.updatedAt))
      .limit(1);
    if (existing) {
      const [site] = await transaction
        .update(trainingSites)
        .set({
          ...details,
          isActive: true,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(trainingSites.id, existing.id))
        .returning();
      if (!site) throw new Error("Site was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: existing.archivedAt ? "site.revived" : "site.reactivated",
        entityType: "site",
        entityId: site.id,
        details: { name: site.name },
      });
      return site;
    }
    const [site] = await transaction
      .insert(trainingSites)
      .values(details)
      .returning();
    if (!site) throw new Error("Site was not created.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "site.created",
      entityType: "site",
      entityId: site.id,
      details: { name: site.name },
    });
    return site;
  });
}

export async function updateSite(
  db: Database,
  actor: Actor,
  id: string,
  input: z.infer<typeof siteInput>,
) {
  const parsed = siteInput.parse(input);
  return db.transaction(async (transaction) => {
    const [site] = await transaction
      .update(trainingSites)
      .set({
        name: parsed.name,
        address: nullable(parsed.address ?? ""),
        city: nullable(parsed.city ?? ""),
        state: nullable(parsed.state ?? ""),
        zip: nullable(parsed.zip ?? ""),
        updatedAt: new Date(),
      })
      .where(eq(trainingSites.id, id))
      .returning();
    if (!site) throw new Error("Site not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "site.updated",
      entityType: "site",
      entityId: site.id,
      details: { name: site.name },
    });
    return site;
  });
}

export async function setSiteActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [site] = await transaction
      .update(trainingSites)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(trainingSites.id, id))
      .returning();
    if (!site) throw new Error("Site not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive ? "site.activated" : "site.deactivated",
      entityType: "site",
      entityId: site.id,
    });
    return site;
  });
}

export async function archiveSite(db: Database, actor: Actor, id: string) {
  return db.transaction(async (transaction) => {
    const [site] = await transaction
      .update(trainingSites)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(trainingSites.id, id))
      .returning();
    if (!site) throw new Error("Site not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "site.archived",
      entityType: "site",
      entityId: site.id,
    });
    return site;
  });
}

// ── Training code import ──────────────────────────────────────────────────

export async function importTrainingCodes(
  db: Database,
  actor: Actor,
  rows: z.infer<typeof trainingCodeInput>[],
) {
  const parsed = rows.map((row) => trainingCodeInput.parse(row));
  return db.transaction(async (transaction) => {
    const importedIds: string[] = [];
    for (const row of parsed) {
      const result = await transaction
        .insert(trainingCodes)
        .values(row)
        .onConflictDoUpdate({
          target: [trainingCodes.code, trainingCodes.sourceRevision],
          set: {
            title: sql`excluded.title`,
            isActive: true,
            archivedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: trainingCodes.id });
      if (result[0]) importedIds.push(result[0].id);
    }
    // Retire entries dropped from the approved list. This assumes a full-list
    // import; a partial import would archive the rest of the catalog.
    if (importedIds.length > 0) {
      await transaction
        .update(trainingCodes)
        .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
        .where(notInArray(trainingCodes.id, importedIds));
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "training_code.imported",
        entityType: "training_code",
        details: { count: importedIds.length },
      });
    }
    return importedIds.length;
  });
}

// ── Approved curriculum import ────────────────────────────────────────────

const curriculumInput = z.object({
  publisher: z.string().trim().min(1).max(200),
  programTitle: z.string().trim().min(1).max(300),
  version: z.string().trim().max(100).optional().default(""),
  additionalRequirements: z.string().trim().max(500).optional().default(""),
  sourceRevision: z.string().trim().min(1).max(100),
});

export async function importCurricula(
  db: Database,
  actor: Actor,
  rows: z.input<typeof curriculumInput>[],
) {
  const parsed = rows.map((row) => curriculumInput.parse(row));
  return db.transaction(async (transaction) => {
    const importedIds: string[] = [];
    for (const row of parsed) {
      const result = await transaction
        .insert(curricula)
        .values({
          publisher: row.publisher,
          programTitle: row.programTitle,
          version: row.version || null,
          additionalRequirements: row.additionalRequirements || null,
          sourceRevision: row.sourceRevision,
        })
        .onConflictDoUpdate({
          target: [
            curricula.publisher,
            curricula.programTitle,
            curricula.sourceRevision,
          ],
          set: {
            version: sql`excluded.version`,
            additionalRequirements: sql`excluded.additional_requirements`,
            isActive: true,
            archivedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning({ id: curricula.id });
      if (result[0]) importedIds.push(result[0].id);
    }
    // Retire entries dropped from the approved list (full-list import).
    if (importedIds.length > 0) {
      await transaction
        .update(curricula)
        .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
        .where(notInArray(curricula.id, importedIds));
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.imported",
        entityType: "curriculum",
        details: { count: importedIds.length },
      });
    }
    return importedIds.length;
  });
}

export async function listCurricula(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(curricula)
    .where(
      and(
        isNull(curricula.archivedAt),
        or(
          ilike(curricula.publisher, term),
          ilike(curricula.programTitle, term),
        ),
      ),
    )
    .orderBy(curricula.publisher, curricula.programTitle)
    .limit(200);
}

export async function getCurriculum(db: Database, id: string) {
  const [curriculum] = await db
    .select()
    .from(curricula)
    .where(eq(curricula.id, id))
    .limit(1);
  return curriculum ?? null;
}

// ── Reference record lifecycle ────────────────────────────────────────────

export async function setTrainingCodeActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [code] = await transaction
      .update(trainingCodes)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(trainingCodes.id, id))
      .returning();
    if (!code) throw new Error("Training code not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive
        ? "training_code.activated"
        : "training_code.deactivated",
      entityType: "training_code",
      entityId: code.id,
    });
    return code;
  });
}

export async function archiveTrainingCode(
  db: Database,
  actor: Actor,
  id: string,
) {
  return db.transaction(async (transaction) => {
    const [code] = await transaction
      .update(trainingCodes)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(trainingCodes.id, id))
      .returning();
    if (!code) throw new Error("Training code not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "training_code.archived",
      entityType: "training_code",
      entityId: code.id,
    });
    return code;
  });
}

export async function setCurriculumActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [curriculum] = await transaction
      .update(curricula)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(curricula.id, id))
      .returning();
    if (!curriculum) throw new Error("Curriculum not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive ? "curriculum.activated" : "curriculum.deactivated",
      entityType: "curriculum",
      entityId: curriculum.id,
    });
    return curriculum;
  });
}

export async function archiveCurriculum(
  db: Database,
  actor: Actor,
  id: string,
) {
  return db.transaction(async (transaction) => {
    const [curriculum] = await transaction
      .update(curricula)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(curricula.id, id))
      .returning();
    if (!curriculum) throw new Error("Curriculum not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "curriculum.archived",
      entityType: "curriculum",
      entityId: curriculum.id,
    });
    return curriculum;
  });
}

export async function createTrainingCode(
  db: Database,
  actor: Actor,
  input: z.input<typeof trainingCodeInput>,
) {
  const parsed = trainingCodeInput.parse(input);
  return db.transaction(async (transaction) => {
    try {
      const [code] = await transaction
        .insert(trainingCodes)
        .values(parsed)
        .returning();
      if (!code) throw new Error("Training code was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "training_code.created",
        entityType: "training_code",
        entityId: code.id,
        details: { code: code.code },
      });
      return code;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "A training code with that code and source revision already exists.",
        );
      }
      throw error;
    }
  });
}

export async function updateTrainingCode(
  db: Database,
  actor: Actor,
  id: string,
  input: z.input<typeof trainingCodeInput>,
) {
  const parsed = trainingCodeInput.parse(input);
  return db.transaction(async (transaction) => {
    try {
      const [code] = await transaction
        .update(trainingCodes)
        .set({
          code: parsed.code,
          title: parsed.title,
          sourceRevision: parsed.sourceRevision,
          updatedAt: new Date(),
        })
        .where(eq(trainingCodes.id, id))
        .returning();
      if (!code) throw new Error("Training code not found.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "training_code.updated",
        entityType: "training_code",
        entityId: code.id,
        details: { code: code.code },
      });
      return code;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "A training code with that code and source revision already exists.",
        );
      }
      throw error;
    }
  });
}

export async function createCurriculum(
  db: Database,
  actor: Actor,
  input: z.input<typeof curriculumInput>,
) {
  const parsed = curriculumInput.parse(input);
  return db.transaction(async (transaction) => {
    try {
      const [curriculum] = await transaction
        .insert(curricula)
        .values({
          publisher: parsed.publisher,
          programTitle: parsed.programTitle,
          version: parsed.version || null,
          additionalRequirements: parsed.additionalRequirements || null,
          sourceRevision: parsed.sourceRevision,
        })
        .returning();
      if (!curriculum) throw new Error("Curriculum was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.created",
        entityType: "curriculum",
        entityId: curriculum.id,
        details: { programTitle: curriculum.programTitle },
      });
      return curriculum;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "A curriculum with that publisher, program title, and source revision already exists.",
        );
      }
      throw error;
    }
  });
}

export async function updateCurriculum(
  db: Database,
  actor: Actor,
  id: string,
  input: z.input<typeof curriculumInput>,
) {
  const parsed = curriculumInput.parse(input);
  return db.transaction(async (transaction) => {
    try {
      const [curriculum] = await transaction
        .update(curricula)
        .set({
          publisher: parsed.publisher,
          programTitle: parsed.programTitle,
          version: parsed.version || null,
          additionalRequirements: parsed.additionalRequirements || null,
          sourceRevision: parsed.sourceRevision,
          updatedAt: new Date(),
        })
        .where(eq(curricula.id, id))
        .returning();
      if (!curriculum) throw new Error("Curriculum not found.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.updated",
        entityType: "curriculum",
        entityId: curriculum.id,
        details: { programTitle: curriculum.programTitle },
      });
      return curriculum;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "A curriculum with that publisher, program title, and source revision already exists.",
        );
      }
      throw error;
    }
  });
}

// ── Approved curriculum chapters ──────────────────────────────────────────

const curriculumChapterInput = z.object({
  curriculumId: z.string().uuid(),
  // An empty part means the book has no sections.
  part: z.string().trim().max(200).optional().default(""),
  number: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  position: z.coerce.number().int().min(0).optional().default(0),
  sourceRevision: z.string().trim().min(1).max(100),
});

/**
 * Upserts the approved-curricula chapter catalog. A chapter is identified by its
 * curriculum, section, and number so re-importing updates titles in place.
 */
export async function importCurriculumChapters(
  db: Database,
  actor: Actor,
  rows: z.input<typeof curriculumChapterInput>[],
) {
  const parsed = rows.map((row) => curriculumChapterInput.parse(row));
  return db.transaction(async (transaction) => {
    let upserted = 0;
    for (const row of parsed) {
      const result = await transaction
        .insert(curriculumChapters)
        .values({
          curriculumId: row.curriculumId,
          part: row.part,
          number: row.number,
          title: row.title,
          position: row.position,
          sourceRevision: row.sourceRevision,
        })
        .onConflictDoUpdate({
          target: [
            curriculumChapters.curriculumId,
            curriculumChapters.part,
            curriculumChapters.number,
          ],
          set: {
            title: sql`excluded.title`,
            position: sql`excluded.position`,
            sourceRevision: sql`excluded.source_revision`,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: curriculumChapters.id });
      if (result[0]) upserted += 1;
    }
    if (upserted > 0) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.chapters.imported",
        entityType: "curriculum",
        details: { count: upserted },
      });
    }
    return upserted;
  });
}

export async function listCurriculumChapters(
  db: Database,
  curriculumIds?: string[],
) {
  return db
    .select({
      id: curriculumChapters.id,
      curriculumId: curriculumChapters.curriculumId,
      part: curriculumChapters.part,
      number: curriculumChapters.number,
      title: curriculumChapters.title,
      position: curriculumChapters.position,
    })
    .from(curriculumChapters)
    .where(
      and(
        eq(curriculumChapters.isActive, true),
        curriculumIds?.length
          ? inArray(curriculumChapters.curriculumId, curriculumIds)
          : undefined,
      ),
    )
    .orderBy(curriculumChapters.curriculumId, curriculumChapters.position);
}

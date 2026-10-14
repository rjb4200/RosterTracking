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
  agencyTagLinks,
  agencyTags,
  credentialTypes,
  curricula,
  curriculumChapters,
  mtuCatalogItems,
  studentAgencies,
  studentCredentials,
  students,
  trainingCodes,
  trainingSites,
} from "@/server/db/schema";
import {
  AGENCY_OTHER_SUBTYPES,
  AGENCY_TAG_CODES,
  MTU_CATALOG_KINDS,
  MTU_ROUNDING_MODES,
} from "./constants";
import { validateCredentialValue } from "./credential-format";
import { credentialLookupHash, encryptCredential } from "./crypto";
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
  email: z.string().trim().email().max(254),
  studentNumber: z.string().trim().max(50).optional().or(z.literal("")),
});

const agencyInput = z.object({
  name: z.string().trim().min(1).max(200),
  tagIds: z.array(z.string().uuid()).optional(),
  otherSubtype: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(50).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  trainingCoordinatorName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
  trainingCoordinatorPhone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .or(z.literal("")),
  trainingCoordinatorEmail: z
    .string()
    .trim()
    .email()
    .max(254)
    .optional()
    .or(z.literal("")),
});

export interface AgencyTagView {
  id: string;
  code: string;
  name: string;
  subtype: string | null;
}

const OTHER_SUBTYPE_VALUES: string[] = Object.values(AGENCY_OTHER_SUBTYPES);

function tagOrder(code: string): number {
  const index = Object.values(AGENCY_TAG_CODES).indexOf(
    code as (typeof AGENCY_TAG_CODES)[keyof typeof AGENCY_TAG_CODES],
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

async function loadAgencyTags(
  db: Database,
  agencyIds: string[],
): Promise<Map<string, AgencyTagView[]>> {
  const grouped = new Map<string, AgencyTagView[]>();
  if (agencyIds.length === 0) return grouped;
  const rows = await db
    .select({
      agencyId: agencyTagLinks.agencyId,
      id: agencyTags.id,
      code: agencyTags.code,
      name: agencyTags.name,
      subtype: agencyTagLinks.subtype,
    })
    .from(agencyTagLinks)
    .innerJoin(agencyTags, eq(agencyTags.id, agencyTagLinks.tagId))
    .where(inArray(agencyTagLinks.agencyId, agencyIds));
  for (const row of rows) {
    const list = grouped.get(row.agencyId) ?? [];
    list.push({
      id: row.id,
      code: row.code,
      name: row.name,
      subtype: row.subtype,
    });
    grouped.set(row.agencyId, list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => tagOrder(a.code) - tagOrder(b.code));
  }
  return grouped;
}

/**
 * Replaces an agency's tag links, validating that each tag exists and is
 * active and that an Other subtype is only set alongside the Other tag.
 */
async function replaceAgencyTagLinks(
  transaction: DatabaseTransaction,
  agencyId: string,
  tagIds: string[],
  otherSubtype: string,
): Promise<void> {
  const uniqueIds = [...new Set(tagIds)];
  const rows = uniqueIds.length
    ? await transaction
        .select({ id: agencyTags.id, code: agencyTags.code })
        .from(agencyTags)
        .where(
          and(inArray(agencyTags.id, uniqueIds), eq(agencyTags.isActive, true)),
        )
    : [];
  if (rows.length !== uniqueIds.length) {
    throw new Error("One or more selected tags are not available.");
  }

  const subtype = otherSubtype.trim() || null;
  let resolvedSubtype: string | null = null;
  if (subtype) {
    if (!OTHER_SUBTYPE_VALUES.includes(subtype)) {
      throw new Error("Choose a valid Other subtype.");
    }
    if (!rows.some((row) => row.code === AGENCY_TAG_CODES.OTHER)) {
      throw new Error(
        "An Other subtype can only be set when the Other tag is selected.",
      );
    }
    resolvedSubtype = subtype;
  }

  await transaction
    .delete(agencyTagLinks)
    .where(eq(agencyTagLinks.agencyId, agencyId));
  if (rows.length > 0) {
    await transaction.insert(agencyTagLinks).values(
      rows.map((row) => ({
        agencyId,
        tagId: row.id,
        subtype: row.code === AGENCY_TAG_CODES.OTHER ? resolvedSubtype : null,
      })),
    );
  }
}

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

const MANUAL_SOURCE_REVISION = "manual";

const trainingCodeInput = z.object({
  code: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  sourceRevision: z.string().trim().max(50).optional().default(""),
});

function nullable(value: string): string | null {
  return value === "" ? null : value;
}

/** Normalizes a US phone number, leaving a blank value as null. */
function optionalPhone(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : normalizePhone(trimmed);
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
  const rows = await db
    .select()
    .from(agencies)
    .where(and(isNull(agencies.archivedAt), ilike(agencies.name, term)))
    .orderBy(agencies.name)
    .limit(100);
  const tagsByAgency = await loadAgencyTags(
    db,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({ ...row, tags: tagsByAgency.get(row.id) ?? [] }));
}

/** The active tag vocabulary, in canonical order, for the agency form. */
export async function listAgencyTags(db: Database) {
  const rows = await db
    .select({ id: agencyTags.id, code: agencyTags.code, name: agencyTags.name })
    .from(agencyTags)
    .where(eq(agencyTags.isActive, true));
  return rows.sort((a, b) => tagOrder(a.code) - tagOrder(b.code));
}

export async function getAgency(db: Database, id: string) {
  const [agency] = await db
    .select()
    .from(agencies)
    .where(eq(agencies.id, id))
    .limit(1);
  if (!agency) return null;
  const tags = (await loadAgencyTags(db, [agency.id])).get(agency.id) ?? [];
  return { ...agency, tags };
}

export async function createAgency(
  db: Database,
  actor: Actor,
  input: z.infer<typeof agencyInput>,
) {
  const parsed = agencyInput.parse(input);
  const details = {
    name: parsed.name,
    address: nullable(parsed.address ?? ""),
    city: nullable(parsed.city ?? ""),
    state: nullable(parsed.state ?? ""),
    zip: nullable(parsed.zip ?? ""),
    contactName: nullable(parsed.contactName ?? ""),
    phone: nullable(parsed.phone ?? ""),
    email: nullable(parsed.email ?? ""),
    trainingCoordinatorName: nullable(parsed.trainingCoordinatorName ?? ""),
    trainingCoordinatorPhone: optionalPhone(
      parsed.trainingCoordinatorPhone ?? "",
    ),
    trainingCoordinatorEmail: nullable(parsed.trainingCoordinatorEmail ?? ""),
  };
  const tagIds = parsed.tagIds ?? [];
  const otherSubtype = parsed.otherSubtype ?? "";
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
      await replaceAgencyTagLinks(transaction, agency.id, tagIds, otherSubtype);
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
      await replaceAgencyTagLinks(transaction, agency.id, tagIds, otherSubtype);
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
  const tagIds = parsed.tagIds ?? [];
  const otherSubtype = parsed.otherSubtype ?? "";
  return db.transaction(async (transaction) => {
    const [agency] = await transaction
      .update(agencies)
      .set({
        name: parsed.name,
        address: nullable(parsed.address ?? ""),
        city: nullable(parsed.city ?? ""),
        state: nullable(parsed.state ?? ""),
        zip: nullable(parsed.zip ?? ""),
        contactName: nullable(parsed.contactName ?? ""),
        phone: nullable(parsed.phone ?? ""),
        email: nullable(parsed.email ?? ""),
        trainingCoordinatorName: nullable(parsed.trainingCoordinatorName ?? ""),
        trainingCoordinatorPhone: optionalPhone(
          parsed.trainingCoordinatorPhone ?? "",
        ),
        trainingCoordinatorEmail: nullable(
          parsed.trainingCoordinatorEmail ?? "",
        ),
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, id))
      .returning();
    if (!agency) throw new Error("Agency not found.");
    await replaceAgencyTagLinks(transaction, agency.id, tagIds, otherSubtype);
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
  const expirationDate = parsed.expirationDate ? parsed.expirationDate : null;

  return db.transaction(async (transaction) => {
    const [type] = await transaction
      .select({
        code: credentialTypes.code,
        valuePattern: credentialTypes.valuePattern,
      })
      .from(credentialTypes)
      .where(
        and(
          eq(credentialTypes.id, credentialTypeId),
          eq(credentialTypes.isActive, true),
        ),
      )
      .limit(1);
    if (!type) throw new Error("Credential type is unavailable.");
    const normalizedValue = validateCredentialValue(parsed.value, type);
    const maskedSuffix = credentialMaskedSuffix(normalizedValue);
    const valueHash = credentialLookupHash(normalizedValue);
    const encryptedValue = encryptCredential(normalizedValue);
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
  sourceRevision: z.string().trim().max(100).optional().default(""),
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
  const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
  return db.transaction(async (transaction) => {
    try {
      const [code] = await transaction
        .insert(trainingCodes)
        .values({
          code: parsed.code,
          title: parsed.title,
          sourceRevision,
        })
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
  const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
  return db.transaction(async (transaction) => {
    try {
      const [code] = await transaction
        .update(trainingCodes)
        .set({
          code: parsed.code,
          title: parsed.title,
          sourceRevision,
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
  const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
  return db.transaction(async (transaction) => {
    try {
      const [curriculum] = await transaction
        .insert(curricula)
        .values({
          publisher: parsed.publisher,
          programTitle: parsed.programTitle,
          version: parsed.version || null,
          additionalRequirements: parsed.additionalRequirements || null,
          sourceRevision,
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
  const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
  return db.transaction(async (transaction) => {
    try {
      const [curriculum] = await transaction
        .update(curricula)
        .set({
          publisher: parsed.publisher,
          programTitle: parsed.programTitle,
          version: parsed.version || null,
          additionalRequirements: parsed.additionalRequirements || null,
          sourceRevision,
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

// ── Chapter authoring ─────────────────────────────────────────────────────

const curriculumChapterWriteInput = z.object({
  part: z.string().trim().max(200).optional().default(""),
  number: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  sourceRevision: z.string().trim().max(100).optional().default(""),
});

/** A chapter's position is derived from a leading integer in its number. */
function deriveChapterPosition(number: string): number | null {
  const match = /^\s*(\d+)/.exec(number);
  return match ? Number(match[1]) : null;
}

async function nextChapterPosition(
  transaction: DatabaseTransaction,
  curriculumId: string,
): Promise<number> {
  const [row] = await transaction
    .select({
      next: sql<number>`coalesce(max(${curriculumChapters.position}), 0) + 1`,
    })
    .from(curriculumChapters)
    .where(eq(curriculumChapters.curriculumId, curriculumId));
  return row?.next ?? 1;
}

/** Chapters for a curriculum's record page, including archived ones. */
export async function listCurriculumChaptersForAdmin(
  db: Database,
  curriculumId: string,
) {
  return db
    .select({
      id: curriculumChapters.id,
      part: curriculumChapters.part,
      number: curriculumChapters.number,
      title: curriculumChapters.title,
      position: curriculumChapters.position,
      sourceRevision: curriculumChapters.sourceRevision,
      isActive: curriculumChapters.isActive,
      archivedAt: curriculumChapters.archivedAt,
    })
    .from(curriculumChapters)
    .where(eq(curriculumChapters.curriculumId, curriculumId))
    .orderBy(curriculumChapters.position, curriculumChapters.number);
}

/** The minimal chapter shape the book-order helper needs. */
export interface BookOrderChapter {
  id: string;
  part: string;
  number: string;
  position: number;
}

/**
 * Orders chapters in book order: sections appear in the order they first occur
 * when chapters are ordered by position then number, chapters keep that order
 * within their section, and unsectioned chapters are listed last.
 */
export function orderChaptersInBookOrder<T extends BookOrderChapter>(
  rows: readonly T[],
): T[] {
  const base = [...rows].sort(
    (a, b) =>
      a.position - b.position ||
      a.number.localeCompare(b.number, undefined, { numeric: true }) ||
      a.id.localeCompare(b.id),
  );
  const sectionOrder = new Map<string, number>();
  for (const row of base) {
    if (row.part && !sectionOrder.has(row.part)) {
      sectionOrder.set(row.part, sectionOrder.size);
    }
  }
  return base.sort((a, b) => {
    const aKey = a.part
      ? (sectionOrder.get(a.part) ?? 0)
      : Number.MAX_SAFE_INTEGER;
    const bKey = b.part
      ? (sectionOrder.get(b.part) ?? 0)
      : Number.MAX_SAFE_INTEGER;
    return aKey - bKey;
  });
}

/**
 * Authors a chapter for a curriculum. A number's leading integer sets its
 * position; otherwise it is appended. Re-adding a section and number that match
 * an archived chapter reactivates it; matching an active chapter is an error.
 */
export async function createCurriculumChapter(
  db: Database,
  actor: Actor,
  curriculumId: string,
  input: z.input<typeof curriculumChapterWriteInput>,
) {
  const parsed = curriculumChapterWriteInput.parse(input);
  return db.transaction(async (transaction) => {
    const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
    const position =
      deriveChapterPosition(parsed.number) ??
      (await nextChapterPosition(transaction, curriculumId));
    const [existing] = await transaction
      .select()
      .from(curriculumChapters)
      .where(
        and(
          eq(curriculumChapters.curriculumId, curriculumId),
          eq(curriculumChapters.part, parsed.part),
          eq(curriculumChapters.number, parsed.number),
        ),
      )
      .limit(1)
      .for("update");
    if (existing) {
      if (!existing.archivedAt) {
        throw new Error(
          "A chapter with that section and number already exists for this curriculum.",
        );
      }
      const [revived] = await transaction
        .update(curriculumChapters)
        .set({
          title: parsed.title,
          position,
          sourceRevision,
          isActive: true,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(curriculumChapters.id, existing.id))
        .returning();
      if (!revived) throw new Error("Chapter was not reactivated.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.chapter.reactivated",
        entityType: "curriculum",
        entityId: curriculumId,
        details: { chapterId: existing.id, number: parsed.number },
      });
      return revived;
    }
    const [chapter] = await transaction
      .insert(curriculumChapters)
      .values({
        curriculumId,
        part: parsed.part,
        number: parsed.number,
        title: parsed.title,
        position,
        sourceRevision,
      })
      .returning();
    if (!chapter) throw new Error("Chapter was not created.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "curriculum.chapter.created",
      entityType: "curriculum",
      entityId: curriculumId,
      details: { chapterId: chapter.id, number: chapter.number },
    });
    return chapter;
  });
}

export async function updateCurriculumChapter(
  db: Database,
  actor: Actor,
  id: string,
  input: z.input<typeof curriculumChapterWriteInput>,
) {
  const parsed = curriculumChapterWriteInput.parse(input);
  return db.transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(curriculumChapters)
      .where(eq(curriculumChapters.id, id))
      .limit(1)
      .for("update");
    if (!current) throw new Error("Chapter not found.");
    const sourceRevision = parsed.sourceRevision || MANUAL_SOURCE_REVISION;
    const position =
      deriveChapterPosition(parsed.number) ??
      (await nextChapterPosition(transaction, current.curriculumId));
    try {
      const [chapter] = await transaction
        .update(curriculumChapters)
        .set({
          part: parsed.part,
          number: parsed.number,
          title: parsed.title,
          position,
          sourceRevision,
          updatedAt: new Date(),
        })
        .where(eq(curriculumChapters.id, id))
        .returning();
      if (!chapter) throw new Error("Chapter not found.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "curriculum.chapter.updated",
        entityType: "curriculum",
        entityId: chapter.curriculumId,
        details: { chapterId: chapter.id, number: chapter.number },
      });
      return chapter;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error(
          "Another chapter already uses that section and number.",
        );
      }
      throw error;
    }
  });
}

export async function archiveCurriculumChapter(
  db: Database,
  actor: Actor,
  id: string,
) {
  return db.transaction(async (transaction) => {
    const [chapter] = await transaction
      .update(curriculumChapters)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(curriculumChapters.id, id))
      .returning();
    if (!chapter) throw new Error("Chapter not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "curriculum.chapter.archived",
      entityType: "curriculum",
      entityId: chapter.curriculumId,
      details: { chapterId: chapter.id, number: chapter.number },
    });
    return chapter;
  });
}

export async function reactivateCurriculumChapter(
  db: Database,
  actor: Actor,
  id: string,
) {
  return db.transaction(async (transaction) => {
    const [chapter] = await transaction
      .update(curriculumChapters)
      .set({ archivedAt: null, isActive: true, updatedAt: new Date() })
      .where(eq(curriculumChapters.id, id))
      .returning();
    if (!chapter) throw new Error("Chapter not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "curriculum.chapter.reactivated",
      entityType: "curriculum",
      entityId: chapter.curriculumId,
      details: { chapterId: chapter.id, number: chapter.number },
    });
    return chapter;
  });
}

// ── Mobile Training Unit catalog ──────────────────────────────────────────

const MTU_KIND_VALUES: string[] = Object.values(MTU_CATALOG_KINDS);
const MTU_ROUNDING_VALUES: string[] = Object.values(MTU_ROUNDING_MODES);

const mtuCatalogItemInput = z.object({
  kind: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(200),
  unitLabel: z.string().trim().max(50).optional().or(z.literal("")),
  perClassQty: z.union([z.string(), z.number()]).optional(),
  perStudentQty: z.union([z.string(), z.number()]).optional(),
  rounding: z.string().trim().max(20).optional().or(z.literal("")),
  requiresMileage: z.union([z.boolean(), z.string()]).optional(),
  sortOrder: z.union([z.string(), z.number()]).optional(),
});

function parseBooleanFlag(value: boolean | string | undefined): boolean {
  if (value === true) return true;
  if (value === undefined || value === false) return false;
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "on" || text === "1" || text === "yes";
}

export type MtuCatalogItemInput = z.input<typeof mtuCatalogItemInput>;

function parseQuantity(
  value: string | number | undefined,
  label: string,
): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return parsed;
}

interface NormalizedMtuCatalogItem {
  kind: string;
  name: string;
  unitLabel: string | null;
  perClassQty: string | null;
  perStudentQty: string | null;
  rounding: string | null;
  requiresMileage: boolean | null;
  sortOrder: number;
}

/**
 * Equipment carries no quantity rule. Supplies require a unit label and a
 * rounding mode, with non-negative per-class and per-student quantities.
 * Transport carries no quantity rule but declares whether it requires mileage.
 */
export function normalizeMtuCatalogItem(
  input: MtuCatalogItemInput,
): NormalizedMtuCatalogItem {
  const parsed = mtuCatalogItemInput.parse(input);
  if (!MTU_KIND_VALUES.includes(parsed.kind)) {
    throw new Error("Choose equipment, supplies, or transport.");
  }
  const name = parsed.name.trim();
  const sortOrder = Number(parseQuantity(parsed.sortOrder, "Sort order") ?? 0);
  if (parsed.kind === MTU_CATALOG_KINDS.EQUIPMENT) {
    return {
      kind: parsed.kind,
      name,
      unitLabel: null,
      perClassQty: null,
      perStudentQty: null,
      rounding: null,
      requiresMileage: null,
      sortOrder,
    };
  }
  if (parsed.kind === MTU_CATALOG_KINDS.TRANSPORT) {
    return {
      kind: parsed.kind,
      name,
      unitLabel: null,
      perClassQty: null,
      perStudentQty: null,
      rounding: null,
      requiresMileage: parseBooleanFlag(parsed.requiresMileage),
      sortOrder,
    };
  }
  const unitLabel = (parsed.unitLabel ?? "").trim();
  if (!unitLabel) throw new Error("Supplies need a unit label.");
  const rounding = (parsed.rounding ?? "").trim();
  if (!MTU_ROUNDING_VALUES.includes(rounding)) {
    throw new Error("Choose a rounding mode of round up or exact.");
  }
  const perClassQty = parseQuantity(parsed.perClassQty, "Per-class quantity");
  const perStudentQty = parseQuantity(
    parsed.perStudentQty,
    "Per-student quantity",
  );
  return {
    kind: parsed.kind,
    name,
    unitLabel,
    perClassQty: perClassQty === null ? null : perClassQty.toString(),
    perStudentQty: perStudentQty === null ? null : perStudentQty.toString(),
    rounding,
    requiresMileage: null,
    sortOrder,
  };
}

/**
 * Insert committed MTU catalog entries that are missing, without touching any
 * entry that already exists. Used by provisioning so a fresh database receives
 * the catalog while a database that already holds edited entries keeps them.
 */
export async function reconcileMtuCatalog(
  db: Database,
  actor: Actor,
  rows: MtuCatalogItemInput[],
) {
  const normalized = rows.map((row) => normalizeMtuCatalogItem(row));
  return db.transaction(async (transaction) => {
    let inserted = 0;
    for (const item of normalized) {
      const result = await transaction
        .insert(mtuCatalogItems)
        .values(item)
        .onConflictDoNothing()
        .returning({ id: mtuCatalogItems.id });
      if (result[0]) inserted += 1;
    }
    if (inserted > 0) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "mtu_catalog.reconciled",
        entityType: "mtu_catalog_item",
        details: { inserted },
      });
    }
    return inserted;
  });
}

export async function listMtuCatalogItems(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(mtuCatalogItems)
    .where(
      and(
        isNull(mtuCatalogItems.archivedAt),
        ilike(mtuCatalogItems.name, term),
      ),
    )
    .orderBy(
      mtuCatalogItems.kind,
      mtuCatalogItems.sortOrder,
      mtuCatalogItems.name,
    )
    .limit(200);
}

export async function listActiveMtuCatalogItems(db: Database) {
  return db
    .select()
    .from(mtuCatalogItems)
    .where(eq(mtuCatalogItems.isActive, true))
    .orderBy(
      mtuCatalogItems.kind,
      mtuCatalogItems.sortOrder,
      mtuCatalogItems.name,
    );
}

export async function getMtuCatalogItem(db: Database, id: string) {
  const [item] = await db
    .select()
    .from(mtuCatalogItems)
    .where(eq(mtuCatalogItems.id, id))
    .limit(1);
  return item ?? null;
}

export async function createMtuCatalogItem(
  db: Database,
  actor: Actor,
  input: MtuCatalogItemInput,
) {
  const details = normalizeMtuCatalogItem(input);
  return db.transaction(async (transaction) => {
    // Re-adding an archived or inactive item with the same kind and name
    // revives or reactivates it instead of creating a duplicate.
    const [existing] = await transaction
      .select()
      .from(mtuCatalogItems)
      .where(
        and(
          eq(mtuCatalogItems.kind, details.kind),
          sql`lower(btrim(${mtuCatalogItems.name})) = lower(btrim(${details.name}))`,
          or(
            isNotNull(mtuCatalogItems.archivedAt),
            eq(mtuCatalogItems.isActive, false),
          ),
        ),
      )
      .orderBy(desc(mtuCatalogItems.updatedAt))
      .limit(1);
    if (existing) {
      const [item] = await transaction
        .update(mtuCatalogItems)
        .set({
          ...details,
          isActive: true,
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(mtuCatalogItems.id, existing.id))
        .returning();
      if (!item) throw new Error("Catalog item was not created.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: existing.archivedAt
          ? "mtu_catalog_item.revived"
          : "mtu_catalog_item.reactivated",
        entityType: "mtu_catalog_item",
        entityId: item.id,
        details: { kind: item.kind, name: item.name },
      });
      return item;
    }
    const [item] = await transaction
      .insert(mtuCatalogItems)
      .values(details)
      .returning();
    if (!item) throw new Error("Catalog item was not created.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "mtu_catalog_item.created",
      entityType: "mtu_catalog_item",
      entityId: item.id,
      details: { kind: item.kind, name: item.name },
    });
    return item;
  });
}

export async function updateMtuCatalogItem(
  db: Database,
  actor: Actor,
  id: string,
  input: MtuCatalogItemInput,
) {
  const details = normalizeMtuCatalogItem(input);
  try {
    return await db.transaction(async (transaction) => {
      const [item] = await transaction
        .update(mtuCatalogItems)
        .set({ ...details, updatedAt: new Date() })
        .where(eq(mtuCatalogItems.id, id))
        .returning();
      if (!item) throw new Error("Catalog item not found.");
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "mtu_catalog_item.updated",
        entityType: "mtu_catalog_item",
        entityId: item.id,
        details: { kind: item.kind, name: item.name },
      });
      return item;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Another item already uses that name for this kind.");
    }
    throw error;
  }
}

export async function setMtuCatalogItemActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [item] = await transaction
      .update(mtuCatalogItems)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(mtuCatalogItems.id, id))
      .returning();
    if (!item) throw new Error("Catalog item not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive
        ? "mtu_catalog_item.activated"
        : "mtu_catalog_item.deactivated",
      entityType: "mtu_catalog_item",
      entityId: item.id,
    });
    return item;
  });
}

export async function archiveMtuCatalogItem(
  db: Database,
  actor: Actor,
  id: string,
) {
  return db.transaction(async (transaction) => {
    const [item] = await transaction
      .update(mtuCatalogItems)
      .set({ archivedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(mtuCatalogItems.id, id))
      .returning();
    if (!item) throw new Error("Catalog item not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "mtu_catalog_item.archived",
      entityType: "mtu_catalog_item",
      entityId: item.id,
    });
    return item;
  });
}

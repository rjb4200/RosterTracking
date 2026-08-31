import { and, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  courses,
  credentialTypes,
  studentAgencies,
  studentCredentials,
  students,
  trainingCodes,
  trainingSites,
} from "@/server/db/schema";
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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
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
});

const credentialInput = z.object({
  value: z.string().trim().min(1).max(200),
  expirationDate: z.string().trim().max(20).optional().or(z.literal("")),
});

const courseInput = z.object({
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultHours: z.coerce.number().min(0).max(999).optional(),
  trainingCodeId: z.string().uuid().optional().or(z.literal("")),
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
    .where(ilike(agencies.name, term))
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
  return db.transaction(async (transaction) => {
    const [agency] = await transaction
      .insert(agencies)
      .values({
        name: parsed.name,
        type: nullable(parsed.type ?? ""),
        address: nullable(parsed.address ?? ""),
        city: nullable(parsed.city ?? ""),
        state: nullable(parsed.state ?? ""),
        zip: nullable(parsed.zip ?? ""),
      })
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
  const maskedSuffix = credentialMaskedSuffix(parsed.value);
  const valueHash = credentialLookupHash(parsed.value);
  const encryptedValue = encryptCredential(parsed.value);
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

// ── Courses, training codes, and sites ────────────────────────────────────

export async function listCourses(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select({
      id: courses.id,
      name: courses.name,
      description: courses.description,
      defaultHours: courses.defaultHours,
      trainingCodeId: courses.trainingCodeId,
      trainingCode: trainingCodes.code,
      isActive: courses.isActive,
    })
    .from(courses)
    .leftJoin(trainingCodes, eq(trainingCodes.id, courses.trainingCodeId))
    .where(or(ilike(courses.name, term), ilike(trainingCodes.code, term)))
    .orderBy(courses.name)
    .limit(100);
}

export async function getCourse(db: Database, id: string) {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  return course ?? null;
}

export async function listTrainingCodes(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(trainingCodes)
    .where(
      or(ilike(trainingCodes.code, term), ilike(trainingCodes.title, term)),
    )
    .orderBy(trainingCodes.code)
    .limit(100);
}

export async function createCourse(
  db: Database,
  actor: Actor,
  input: z.infer<typeof courseInput>,
) {
  const parsed = courseInput.parse(input);
  return db.transaction(async (transaction) => {
    const [course] = await transaction
      .insert(courses)
      .values({
        name: parsed.name,
        description: nullable(parsed.description ?? ""),
        defaultHours: parsed.defaultHours ? String(parsed.defaultHours) : null,
        trainingCodeId: parsed.trainingCodeId ? parsed.trainingCodeId : null,
      })
      .returning();
    if (!course) throw new Error("Course was not created.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "course.created",
      entityType: "course",
      entityId: course.id,
      details: { name: course.name },
    });
    return course;
  });
}

export async function updateCourse(
  db: Database,
  actor: Actor,
  id: string,
  input: z.infer<typeof courseInput>,
) {
  const parsed = courseInput.parse(input);
  return db.transaction(async (transaction) => {
    const [course] = await transaction
      .update(courses)
      .set({
        name: parsed.name,
        description: nullable(parsed.description ?? ""),
        defaultHours: parsed.defaultHours ? String(parsed.defaultHours) : null,
        trainingCodeId: parsed.trainingCodeId ? parsed.trainingCodeId : null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();
    if (!course) throw new Error("Course not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "course.updated",
      entityType: "course",
      entityId: course.id,
      details: { name: course.name },
    });
    return course;
  });
}

export async function setCourseActive(
  db: Database,
  actor: Actor,
  id: string,
  isActive: boolean,
) {
  return db.transaction(async (transaction) => {
    const [course] = await transaction
      .update(courses)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    if (!course) throw new Error("Course not found.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: isActive ? "course.activated" : "course.deactivated",
      entityType: "course",
      entityId: course.id,
    });
    return course;
  });
}

export async function listSites(db: Database, query: string) {
  const term = `%${query.trim()}%`;
  return db
    .select()
    .from(trainingSites)
    .where(ilike(trainingSites.name, term))
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
  return db.transaction(async (transaction) => {
    const [site] = await transaction
      .insert(trainingSites)
      .values({
        name: parsed.name,
        address: nullable(parsed.address ?? ""),
        city: nullable(parsed.city ?? ""),
        state: nullable(parsed.state ?? ""),
        zip: nullable(parsed.zip ?? ""),
      })
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

// ── Training code import ──────────────────────────────────────────────────

export async function importTrainingCodes(
  db: Database,
  actor: Actor,
  rows: z.infer<typeof trainingCodeInput>[],
) {
  const parsed = rows.map((row) => trainingCodeInput.parse(row));
  return db.transaction(async (transaction) => {
    let inserted = 0;
    for (const row of parsed) {
      const result = await transaction
        .insert(trainingCodes)
        .values(row)
        .onConflictDoUpdate({
          target: [trainingCodes.code, trainingCodes.sourceRevision],
          set: {
            title: sql`excluded.title`,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning({ id: trainingCodes.id });
      if (result[0]) inserted += 1;
    }
    if (inserted > 0) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "training_code.imported",
        entityType: "training_code",
        details: { count: inserted },
      });
    }
    return inserted;
  });
}

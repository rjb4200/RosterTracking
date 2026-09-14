import "server-only";

import { and, asc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { validateRosterCompletion } from "@/modules/instructor-roster/services";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  attendance,
  classComponents,
  classInstructors,
  classReportingSystems,
  courseReportingDefaults,
  courses,
  finalizationRevisions,
  reportingSystems,
  roles,
  trainingClasses,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";

import {
  CLASS_DELIVERY_METHODS,
  CLASS_STATUSES,
  type ClassStatus,
} from "./constants";
import {
  calculateComponentEndTime,
  validateClassReadiness,
  validateClassTransition,
  validateComponentRange,
  validateDeliverySite,
} from "./policy";
import { getDepartmentCalendarDate, parseDepartmentDateTime } from "./time";
import {
  decryptClassAccessPin,
  encryptClassAccessPin,
  generateClassAccessPin,
  generateClassPublicCode,
  generateClassSignInToken,
  hashClassSignInToken,
  verifyClassAccessPin,
} from "./token";

export interface ClassActor {
  id: string;
  username: string;
}

export type OperationalClassAction = "setup" | "roster" | "finalize" | "view";

export function getOperationalClassAction(
  status: string,
): OperationalClassAction {
  if (status === CLASS_STATUSES.DRAFT) return "setup";
  if (status === CLASS_STATUSES.OPEN) return "roster";
  if (status === CLASS_STATUSES.COMPLETED) return "finalize";
  return "view";
}

export function isOverdueRoster(
  status: string,
  finalSessionEndsAt: Date | null,
  now = new Date(),
): boolean {
  return (
    (status === CLASS_STATUSES.OPEN || status === CLASS_STATUSES.COMPLETED) &&
    finalSessionEndsAt !== null &&
    now.getTime() > finalSessionEndsAt.getTime() + 24 * 60 * 60 * 1000
  );
}

function asDate(value: Date | string | null): Date | null {
  return value === null
    ? null
    : value instanceof Date
      ? value
      : new Date(value);
}

const draftInput = z.object({
  courseId: z.string().uuid(),
  trainingSiteId: z.string().uuid().nullable().optional(),
  deliveryMethod: z.enum(CLASS_DELIVERY_METHODS),
  reportingSystemIds: z.array(z.string().uuid()).optional(),
  accessPinEnabled: z.boolean().default(false),
});

const componentInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  startsAt: z.string().transform(parseDepartmentDateTime),
  creditedHours: z.coerce.number().positive().max(999),
  position: z.coerce.number().int().min(0).default(0),
});

async function canManageAllClasses(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<boolean> {
  const elevated = await transaction
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(roles.isActive, true),
        inArray(roles.code, [
          ROLE_CODES.ADMINISTRATOR,
          ROLE_CODES.TRAINING_MAJOR,
        ]),
      ),
    )
    .limit(1);
  return elevated.length > 0;
}

async function requireClassAccess(
  transaction: DatabaseTransaction,
  actor: ClassActor,
  classId: string,
  lock = true,
) {
  const query = transaction
    .select()
    .from(trainingClasses)
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const [classRecord] = lock ? await query.for("update") : await query;
  if (!classRecord) throw new Error("Class not found.");

  if (await canManageAllClasses(transaction, actor.id)) return classRecord;
  if (classRecord.createdByUserId === actor.id) return classRecord;

  const assignment = await transaction
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .limit(1);
  if (assignment.length === 0) throw new Error("Class access denied.");
  return classRecord;
}

async function validateReferences(
  transaction: DatabaseTransaction,
  input: z.infer<typeof draftInput>,
): Promise<void> {
  validateDeliverySite(input.deliveryMethod, input.trainingSiteId ?? null);
  const [course] = await transaction
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, input.courseId), eq(courses.isActive, true)))
    .limit(1);
  if (!course) throw new Error("Select an active course.");

  if (input.trainingSiteId) {
    const [site] = await transaction
      .select({ id: trainingSites.id })
      .from(trainingSites)
      .where(
        and(
          eq(trainingSites.id, input.trainingSiteId),
          eq(trainingSites.isActive, true),
        ),
      )
      .limit(1);
    if (!site) throw new Error("Select an active training site.");
  }

  if (input.reportingSystemIds?.length) {
    const selected = await transaction
      .select({ id: reportingSystems.id })
      .from(reportingSystems)
      .where(
        and(
          inArray(reportingSystems.id, input.reportingSystemIds),
          eq(reportingSystems.isActive, true),
        ),
      );
    if (selected.length !== new Set(input.reportingSystemIds).size) {
      throw new Error("Select only active reporting systems.");
    }
  }
}

async function replaceReportingSystems(
  transaction: DatabaseTransaction,
  classId: string,
  reportingSystemIds: string[],
): Promise<void> {
  await transaction
    .delete(classReportingSystems)
    .where(eq(classReportingSystems.classId, classId));
  const uniqueIds = [...new Set(reportingSystemIds)];
  if (uniqueIds.length > 0) {
    await transaction.insert(classReportingSystems).values(
      uniqueIds.map((reportingSystemId) => ({
        classId,
        reportingSystemId,
      })),
    );
  }
}

async function findAvailablePublicCode(transaction: DatabaseTransaction) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateClassPublicCode();
    const [existing] = await transaction
      .select({ id: trainingClasses.id })
      .from(trainingClasses)
      .where(eq(trainingClasses.publicCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not allocate a public class code. Try again.");
}

export async function createClassDraft(
  db: Database,
  actor: ClassActor,
  input: z.input<typeof draftInput>,
) {
  const parsed = draftInput.parse(input);
  const rawToken = generateClassSignInToken();
  return db.transaction(async (transaction) => {
    await validateReferences(transaction, parsed);
    const defaultRows = parsed.reportingSystemIds
      ? []
      : await transaction
          .select({ id: courseReportingDefaults.reportingSystemId })
          .from(courseReportingDefaults)
          .innerJoin(
            reportingSystems,
            and(
              eq(
                reportingSystems.id,
                courseReportingDefaults.reportingSystemId,
              ),
              eq(reportingSystems.isActive, true),
            ),
          )
          .where(eq(courseReportingDefaults.courseId, parsed.courseId));
    const reportingSystemIds =
      parsed.reportingSystemIds ?? defaultRows.map(({ id }) => id);
    const publicCode = await findAvailablePublicCode(transaction);
    const accessPin = parsed.accessPinEnabled ? generateClassAccessPin() : null;

    const [created] = await transaction
      .insert(trainingClasses)
      .values({
        courseId: parsed.courseId,
        trainingSiteId: parsed.trainingSiteId ?? null,
        createdByUserId: actor.id,
        deliveryMethod: parsed.deliveryMethod,
        signInTokenHash: hashClassSignInToken(rawToken),
        signInTokenVersion: 1,
        publicCode,
        accessPinEnabled: parsed.accessPinEnabled,
        accessPinEncrypted: accessPin ? encryptClassAccessPin(accessPin) : null,
      })
      .returning();
    if (!created) throw new Error("Class was not created.");

    await replaceReportingSystems(transaction, created.id, reportingSystemIds);
    if (reportingSystemIds.length > 0) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "class.reporting_systems.changed",
        entityType: "class",
        entityId: created.id,
        details: { reportingSystemIds },
      });
    }
    await transaction.insert(classInstructors).values({
      classId: created.id,
      userId: actor.id,
      isLead: true,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.instructor.assigned",
      entityType: "class",
      entityId: created.id,
      details: { userId: actor.id, isLead: true },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.created",
      entityType: "class",
      entityId: created.id,
      details: {
        courseId: created.courseId,
        deliveryMethod: created.deliveryMethod,
      },
    });
    return { classRecord: created, rawToken, accessPin };
  });
}

export async function updateClassDraft(
  db: Database,
  actor: ClassActor,
  classId: string,
  input: z.input<typeof draftInput>,
) {
  const parsed = draftInput.parse(input);
  return db.transaction(async (transaction) => {
    const existing = await requireClassAccess(transaction, actor, classId);
    if (existing.status !== CLASS_STATUSES.DRAFT) {
      throw new Error("Only draft classes can be edited.");
    }
    await validateReferences(transaction, parsed);
    const accessPin = parsed.accessPinEnabled
      ? existing.accessPinEnabled
        ? existing.accessPinEncrypted
        : encryptClassAccessPin(generateClassAccessPin())
      : null;
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        courseId: parsed.courseId,
        trainingSiteId: parsed.trainingSiteId ?? null,
        deliveryMethod: parsed.deliveryMethod,
        accessPinEnabled: parsed.accessPinEnabled,
        accessPinEncrypted: accessPin,
        updatedAt: new Date(),
      })
      .where(eq(trainingClasses.id, classId))
      .returning();
    if (!updated) throw new Error("Class was not updated.");
    await replaceReportingSystems(
      transaction,
      classId,
      parsed.reportingSystemIds ?? [],
    );
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.reporting_systems.changed",
      entityType: "class",
      entityId: classId,
      details: { reportingSystemIds: parsed.reportingSystemIds ?? [] },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.updated",
      entityType: "class",
      entityId: classId,
      details: { courseId: updated.courseId },
    });
    return updated;
  });
}

export async function saveClassComponent(
  db: Database,
  actor: ClassActor,
  classId: string,
  input: z.input<typeof componentInput>,
) {
  const parsed = componentInput.parse(input);
  const endsAt = calculateComponentEndTime(
    parsed.startsAt,
    parsed.creditedHours,
  );
  validateComponentRange(parsed.startsAt, endsAt, parsed.creditedHours);
  return db.transaction(async (transaction) => {
    const classRecord = await requireClassAccess(transaction, actor, classId);
    if (classRecord.status !== CLASS_STATUSES.DRAFT) {
      throw new Error("Components can only be changed on draft classes.");
    }
    const existingComponents = await transaction
      .select({ startsAt: classComponents.startsAt })
      .from(classComponents)
      .where(
        and(
          eq(classComponents.classId, classId),
          parsed.id ? sql`${classComponents.id} <> ${parsed.id}` : undefined,
        ),
      )
      .limit(1);
    const existing = existingComponents[0];
    if (
      existing &&
      getDepartmentCalendarDate(existing.startsAt) !==
        getDepartmentCalendarDate(parsed.startsAt)
    ) {
      throw new Error("All class sessions must occur on one roster day.");
    }
    const values = {
      classId,
      title: parsed.title || null,
      startsAt: parsed.startsAt,
      endsAt,
      creditedHours: String(parsed.creditedHours),
      position: parsed.position,
      updatedAt: new Date(),
    };
    const [component] = parsed.id
      ? await transaction
          .update(classComponents)
          .set(values)
          .where(
            and(
              eq(classComponents.id, parsed.id),
              eq(classComponents.classId, classId),
            ),
          )
          .returning()
      : await transaction.insert(classComponents).values(values).returning();
    if (!component) throw new Error("Class component was not saved.");
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.component.saved",
      entityType: "class",
      entityId: classId,
      details: { componentId: component.id },
    });
    return component;
  });
}

export async function assignClassInstructor(
  db: Database,
  actor: ClassActor,
  classId: string,
  userId: string,
  isLead: boolean,
): Promise<void> {
  await db.transaction(async (transaction) => {
    const classRecord = await requireClassAccess(transaction, actor, classId);
    if (classRecord.status !== CLASS_STATUSES.DRAFT) {
      throw new Error("Instructors can only be changed on draft classes.");
    }
    const [activeUser] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);
    if (!activeUser) throw new Error("Select an active staff user.");
    if (isLead) {
      await transaction
        .update(classInstructors)
        .set({ isLead: false })
        .where(eq(classInstructors.classId, classId));
    }
    await transaction
      .insert(classInstructors)
      .values({ classId, userId, isLead })
      .onConflictDoUpdate({
        target: [classInstructors.classId, classInstructors.userId],
        set: { isLead },
      });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.instructor.assigned",
      entityType: "class",
      entityId: classId,
      details: { userId, isLead },
    });
  });
}

export async function transitionClass(
  db: Database,
  actor: ClassActor,
  classId: string,
  nextStatus: ClassStatus,
  cancellationReason?: string,
) {
  return db.transaction(async (transaction) => {
    const current = await requireClassAccess(transaction, actor, classId);
    validateClassTransition(
      current.status as ClassStatus,
      nextStatus,
      cancellationReason,
    );
    if (nextStatus === CLASS_STATUSES.OPEN) {
      const [componentCount, leadCount, reportingCount] = await Promise.all([
        transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(classComponents)
          .where(eq(classComponents.classId, classId)),
        transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(classInstructors)
          .where(
            and(
              eq(classInstructors.classId, classId),
              eq(classInstructors.isLead, true),
            ),
          ),
        transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(classReportingSystems)
          .where(eq(classReportingSystems.classId, classId)),
      ]);
      validateClassReadiness({
        componentCount: componentCount[0]?.count ?? 0,
        leadCount: leadCount[0]?.count ?? 0,
        reportingCount: reportingCount[0]?.count ?? 0,
      });
    }
    if (nextStatus === CLASS_STATUSES.COMPLETED) {
      await validateRosterCompletion(transaction, classId);
    }
    const publicCode =
      nextStatus === CLASS_STATUSES.OPEN && !current.publicCode
        ? await findAvailablePublicCode(transaction)
        : current.publicCode;
    const now = new Date();
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        status: nextStatus,
        cancellationReason:
          nextStatus === CLASS_STATUSES.CANCELLED
            ? cancellationReason?.trim()
            : null,
        openedAt: nextStatus === CLASS_STATUSES.OPEN ? now : current.openedAt,
        completedAt:
          nextStatus === CLASS_STATUSES.COMPLETED ? now : current.completedAt,
        cancelledAt:
          nextStatus === CLASS_STATUSES.CANCELLED ? now : current.cancelledAt,
        publicCode,
        updatedAt: now,
      })
      .where(
        and(
          eq(trainingClasses.id, classId),
          eq(trainingClasses.status, current.status),
        ),
      )
      .returning();
    if (!updated) {
      throw new Error("Class status changed in another request. Try again.");
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.status.changed",
      entityType: "class",
      entityId: classId,
      details: { from: current.status, to: nextStatus },
    });
    return updated;
  });
}

export async function rotateClassSignInToken(
  db: Database,
  actor: ClassActor,
  classId: string,
): Promise<string> {
  const rawToken = generateClassSignInToken();
  await db.transaction(async (transaction) => {
    const current = await requireClassAccess(transaction, actor, classId);
    if (
      current.status === CLASS_STATUSES.COMPLETED ||
      current.status === CLASS_STATUSES.FINALIZED ||
      current.status === CLASS_STATUSES.CANCELLED
    ) {
      throw new Error("Sign-in access cannot be rotated for this class.");
    }
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        signInTokenHash: hashClassSignInToken(rawToken),
        signInTokenVersion: sql`${trainingClasses.signInTokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(trainingClasses.id, classId),
          eq(trainingClasses.status, current.status),
          eq(trainingClasses.signInTokenVersion, current.signInTokenVersion),
        ),
      )
      .returning({
        id: trainingClasses.id,
        signInTokenVersion: trainingClasses.signInTokenVersion,
      });
    if (!updated) {
      throw new Error("Class status changed in another request. Try again.");
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.sign_in.rotated",
      entityType: "class",
      entityId: classId,
    });
  });
  return rawToken;
}

export async function resolveOpenClassToken(db: Database, rawToken: string) {
  const [resolved] = await db
    .select({
      id: trainingClasses.id,
      signInTokenVersion: trainingClasses.signInTokenVersion,
      accessPinEnabled: trainingClasses.accessPinEnabled,
      publicCode: trainingClasses.publicCode,
    })
    .from(trainingClasses)
    .where(
      and(
        eq(trainingClasses.signInTokenHash, hashClassSignInToken(rawToken)),
        eq(trainingClasses.status, CLASS_STATUSES.OPEN),
      ),
    )
    .limit(1);
  return resolved ?? null;
}

export async function resolveOpenClassPublicCode(
  db: Database,
  publicCode: string,
) {
  const [resolved] = await db
    .select({
      id: trainingClasses.id,
      signInTokenVersion: trainingClasses.signInTokenVersion,
      accessPinEnabled: trainingClasses.accessPinEnabled,
      accessPinEncrypted: trainingClasses.accessPinEncrypted,
    })
    .from(trainingClasses)
    .where(
      and(
        eq(trainingClasses.publicCode, publicCode),
        eq(trainingClasses.status, CLASS_STATUSES.OPEN),
      ),
    )
    .limit(1);
  return resolved ?? null;
}

export async function verifyOpenClassAccessPin(
  db: Database,
  publicCode: string,
  pin: string,
) {
  const resolved = await resolveOpenClassPublicCode(db, publicCode);
  if (
    !resolved?.accessPinEnabled ||
    !resolved.accessPinEncrypted ||
    !verifyClassAccessPin(resolved.accessPinEncrypted, pin)
  ) {
    return null;
  }
  return {
    id: resolved.id,
    signInTokenVersion: resolved.signInTokenVersion,
  };
}

export async function listPublicOpenClasses(db: Database) {
  const records = await db
    .select({
      publicCode: trainingClasses.publicCode,
      courseName: courses.name,
      deliveryMethod: trainingClasses.deliveryMethod,
      siteName: trainingSites.name,
    })
    .from(trainingClasses)
    .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        eq(trainingClasses.status, CLASS_STATUSES.OPEN),
        isNotNull(trainingClasses.publicCode),
      ),
    )
    .orderBy(courses.name)
    .limit(100);

  return Promise.all(
    records.map(async (record) => {
      const publicCode = record.publicCode;
      if (!publicCode) throw new Error("Open class is missing public access.");
      const [nextComponent] = await db
        .select({ startsAt: classComponents.startsAt })
        .from(classComponents)
        .innerJoin(
          trainingClasses,
          eq(trainingClasses.id, classComponents.classId),
        )
        .where(eq(trainingClasses.publicCode, publicCode))
        .orderBy(asc(classComponents.startsAt))
        .limit(1);
      const instructorRows = await db
        .select({ displayName: users.displayName })
        .from(classInstructors)
        .innerJoin(users, eq(users.id, classInstructors.userId))
        .innerJoin(
          trainingClasses,
          eq(trainingClasses.id, classInstructors.classId),
        )
        .where(eq(trainingClasses.publicCode, publicCode))
        .orderBy(sql`${classInstructors.isLead} desc`, users.displayName);
      return {
        publicCode,
        courseName: record.courseName,
        location:
          record.deliveryMethod === "virtual"
            ? "Virtual"
            : (record.siteName ?? ""),
        nextSession: nextComponent?.startsAt ?? null,
        instructors: instructorRows.map(({ displayName }) => {
          const parts = displayName.trim().split(/\s+/);
          return parts.length > 1
            ? `${parts[0]?.[0] ?? ""}. ${parts.at(-1) ?? ""}`
            : displayName;
        }),
      };
    }),
  );
}

export async function getClassPublicAccess(
  db: Database,
  actor: ClassActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const current = await requireClassAccess(transaction, actor, classId);
    if (current.status !== CLASS_STATUSES.OPEN) {
      throw new Error(
        "Student access is available only while the class is open.",
      );
    }
    const publicCode =
      current.publicCode ?? (await findAvailablePublicCode(transaction));
    if (!current.publicCode) {
      await transaction
        .update(trainingClasses)
        .set({ publicCode, updatedAt: new Date() })
        .where(eq(trainingClasses.id, classId));
    }
    return {
      publicCode,
      accessPin:
        current.accessPinEnabled && current.accessPinEncrypted
          ? decryptClassAccessPin(current.accessPinEncrypted)
          : null,
    };
  });
}

export async function listClasses(
  db: Database,
  actor: ClassActor,
  query: string,
) {
  const elevated = await db.transaction((transaction) =>
    canManageAllClasses(transaction, actor.id),
  );
  const term = `%${query.trim()}%`;
  const access = elevated
    ? undefined
    : or(
        eq(trainingClasses.createdByUserId, actor.id),
        sql`exists (select 1 from ${classInstructors} where ${classInstructors.classId} = ${trainingClasses.id} and ${classInstructors.userId} = ${actor.id})`,
      );
  return db
    .select({
      id: trainingClasses.id,
      status: trainingClasses.status,
      deliveryMethod: trainingClasses.deliveryMethod,
      courseName: courses.name,
      siteName: trainingSites.name,
      updatedAt: trainingClasses.updatedAt,
    })
    .from(trainingClasses)
    .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        or(ilike(courses.name, term), ilike(trainingSites.name, term)),
        access,
      ),
    )
    .orderBy(sql`${trainingClasses.updatedAt} desc`)
    .limit(100);
}

export async function listOperationalClasses(
  db: Database,
  actor: ClassActor,
  scope: "assigned" | "department",
  now = new Date(),
) {
  const elevated = await db.transaction((transaction) =>
    canManageAllClasses(transaction, actor.id),
  );
  if (scope === "department" && !elevated) return [];

  const assigned = sql`exists (
    select 1 from ${classInstructors}
    where ${classInstructors.classId} = ${trainingClasses.id}
      and ${classInstructors.userId} = ${actor.id}
  )`;
  const records = await db
    .select({
      id: trainingClasses.id,
      status: trainingClasses.status,
      courseName: courses.name,
      siteName: trainingSites.name,
      deliveryMethod: trainingClasses.deliveryMethod,
      firstSessionStartsAt: sql<Date | null>`(
        select min(${classComponents.startsAt}) from ${classComponents}
        where ${classComponents.classId} = ${trainingClasses.id}
      )`,
      finalSessionEndsAt: sql<Date | null>`(
        select max(${classComponents.endsAt}) from ${classComponents}
        where ${classComponents.classId} = ${trainingClasses.id}
      )`,
      attendanceCount: sql<number>`(
        select count(*)::int from ${attendance}
        where ${attendance.classId} = ${trainingClasses.id}
          and ${attendance.removedAt} is null
      )`,
      finalizedAt: sql<Date | null>`(
        select max(${finalizationRevisions.finalizedAt}) from ${finalizationRevisions}
        where ${finalizationRevisions.classId} = ${trainingClasses.id}
      )`,
    })
    .from(trainingClasses)
    .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        inArray(trainingClasses.status, [
          CLASS_STATUSES.DRAFT,
          CLASS_STATUSES.OPEN,
          CLASS_STATUSES.COMPLETED,
        ]),
        scope === "assigned" ? assigned : undefined,
      ),
    )
    .orderBy(sql`(
      select min(${classComponents.startsAt}) from ${classComponents}
      where ${classComponents.classId} = ${trainingClasses.id}
    ) asc nulls last`)
    .limit(100);
  const destinations = await db
    .select({
      classId: classReportingSystems.classId,
      name: reportingSystems.name,
    })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      eq(reportingSystems.id, classReportingSystems.reportingSystemId),
    )
    .where(
      inArray(
        classReportingSystems.classId,
        records.map(({ id }) => id),
      ),
    )
    .orderBy(reportingSystems.name);

  return records.map((record) => {
    const firstSessionStartsAt = asDate(
      record.firstSessionStartsAt as Date | string | null,
    );
    const finalSessionEndsAt = asDate(
      record.finalSessionEndsAt as Date | string | null,
    );
    return {
      ...record,
      firstSessionStartsAt,
      finalSessionEndsAt,
      finalizedAt: asDate(record.finalizedAt as Date | string | null),
      reportingDestinations: destinations
        .filter((destination) => destination.classId === record.id)
        .map((destination) => destination.name),
      action: getOperationalClassAction(record.status),
      isOverdue: isOverdueRoster(record.status, finalSessionEndsAt, now),
    };
  });
}

export async function getClassDetail(
  db: Database,
  actor: ClassActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireClassAccess(
      transaction,
      actor,
      classId,
      false,
    );
    const [course, site, components, instructors, systems] = await Promise.all([
      transaction
        .select({ id: courses.id, name: courses.name })
        .from(courses)
        .where(eq(courses.id, classRecord.courseId))
        .limit(1),
      classRecord.trainingSiteId
        ? transaction
            .select({ id: trainingSites.id, name: trainingSites.name })
            .from(trainingSites)
            .where(eq(trainingSites.id, classRecord.trainingSiteId))
            .limit(1)
        : Promise.resolve([]),
      transaction
        .select()
        .from(classComponents)
        .where(eq(classComponents.classId, classId))
        .orderBy(asc(classComponents.startsAt), asc(classComponents.position)),
      transaction
        .select({
          userId: users.id,
          displayName: users.displayName,
          isLead: classInstructors.isLead,
        })
        .from(classInstructors)
        .innerJoin(users, eq(users.id, classInstructors.userId))
        .where(eq(classInstructors.classId, classId))
        .orderBy(sql`${classInstructors.isLead} desc`, users.displayName),
      transaction
        .select({ id: reportingSystems.id, name: reportingSystems.name })
        .from(classReportingSystems)
        .innerJoin(
          reportingSystems,
          eq(reportingSystems.id, classReportingSystems.reportingSystemId),
        )
        .where(eq(classReportingSystems.classId, classId))
        .orderBy(reportingSystems.name),
    ]);
    return {
      ...classRecord,
      course: course[0] ?? null,
      site: site[0] ?? null,
      components,
      instructors,
      reportingSystems: systems,
    };
  });
}

export async function listClassFormOptions(db: Database) {
  const [courseRows, siteRows, systemRows, staffRows, defaultRows] =
    await Promise.all([
      db
        .select({ id: courses.id, name: courses.name })
        .from(courses)
        .where(eq(courses.isActive, true))
        .orderBy(courses.name),
      db
        .select({ id: trainingSites.id, name: trainingSites.name })
        .from(trainingSites)
        .where(eq(trainingSites.isActive, true))
        .orderBy(trainingSites.name),
      db
        .select({ id: reportingSystems.id, name: reportingSystems.name })
        .from(reportingSystems)
        .where(eq(reportingSystems.isActive, true))
        .orderBy(reportingSystems.name),
      db
        .select({ id: users.id, displayName: users.displayName })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(users.displayName),
      db
        .select({
          courseId: courseReportingDefaults.courseId,
          reportingSystemId: courseReportingDefaults.reportingSystemId,
        })
        .from(courseReportingDefaults),
    ]);
  return {
    courses: courseRows,
    sites: siteRows,
    reportingSystems: systemRows,
    staff: staffRows,
    courseReportingDefaults: defaultRows,
  };
}

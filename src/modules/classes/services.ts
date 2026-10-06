import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  classComponents,
  classInstructors,
  classReportingSystems,
  credentialTypes,
  curricula,
  curriculumChapters,
  finalizationRevisions,
  mtuUsage,
  reportingRequirementSets,
  reportingRequirements,
  reportingSystems,
  roles,
  trainingClasses,
  trainingCodes,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";

import {
  CLASS_DELIVERY_METHODS,
  CLASS_STATUSES,
  type ClassStatus,
} from "./constants";
import { defaultComponentMethod } from "./fire-subjects";
import { hasMtuUsage, type MtuUsage, normalizeMtuUsage } from "./mtu";
import {
  assertClassEditable,
  calculateComponentEndTime,
  validateClassReadiness,
  validateClassTransition,
  validateComponentRange,
  validateDeliverySite,
} from "./policy";
import {
  getDepartmentCalendarDate,
  normalizeDepartmentStartTime,
} from "./time";
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

export type OperationalClassAction = "roster" | "finalize" | "view";

export function getOperationalClassAction(
  status: string,
): OperationalClassAction {
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
  name: z.string().trim().max(200).default(""),
  trainingSiteId: z.string().uuid().nullable().optional(),
  hostAgencyId: z.string().uuid(),
  deliveryMethod: z.enum(CLASS_DELIVERY_METHODS),
  reportingSystemIds: z.array(z.string().uuid()).optional(),
  accessPinEnabled: z.boolean().default(false),
  objectives: z.string().trim().max(2000).default(""),
  courseType: z
    .union([
      z.enum(["continuing_education", "initial_certification", "refresher"]),
      z.literal(""),
    ])
    .optional(),
  courseNumber: z.string().trim().max(100).default(""),
  mtuEquipmentUsed: z.string().trim().max(500).default(""),
  mtuMileage: z.string().trim().max(200).default(""),
  mtuUsedSupplies: z.string().trim().max(500).default(""),
});

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
// Stored KFS-1A Method values: one code, or "cr,ol" for hybrid delivery.
const optionalMethod = z
  .union([
    z.literal("cr"),
    z.literal("ho"),
    z.literal("ol"),
    z.literal("cr,ol"),
    z.literal(""),
  ])
  .optional();

const componentInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  startsAt: z.string().transform(normalizeDepartmentStartTime),
  creditedHours: z.coerce.number().positive().max(999),
  position: z.coerce.number().int().min(0).default(0),
  trainingCodeId: optionalUuid,
  className: z.string().trim().max(200).optional().or(z.literal("")),
  curriculumId: optionalUuid,
  curriculumName: z.string().trim().max(300).optional().or(z.literal("")),
  curriculumChapter: z.string().trim().max(500).optional().or(z.literal("")),
  lessonPlan: z.string().trim().max(500).optional().or(z.literal("")),
  method: optionalMethod,
});

const fireSubjectInput = z.object({
  trainingCodeId: z.string().uuid(),
  className: z.string().trim().min(1).max(200),
  curriculumId: optionalUuid,
  curriculumName: z.string().trim().max(300).optional().or(z.literal("")),
  curriculumChapter: z.string().trim().max(500).optional().or(z.literal("")),
  lessonPlan: z.string().trim().max(500).optional().or(z.literal("")),
});

const scheduledDraftInput = draftInput.extend({
  startsAt: z.string().transform(normalizeDepartmentStartTime),
  creditedHours: z.coerce.number().positive().max(999),
  leadInstructorId: z.string().uuid(),
  subjects: z.array(fireSubjectInput).max(2).optional(),
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

  const [hostAgency] = await transaction
    .select({ id: agencies.id })
    .from(agencies)
    .where(
      and(eq(agencies.id, input.hostAgencyId), eq(agencies.isActive, true)),
    )
    .limit(1);
  if (!hostAgency) throw new Error("Select an active host agency.");

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

/**
 * A chapter is required only when the chosen approved curriculum has catalog
 * chapters; typed books and chapter-less books leave the chapter optional.
 */
async function assertCurriculumChapter(
  transaction: DatabaseTransaction,
  subject: { curriculumId?: string | null; curriculumChapter?: string | null },
): Promise<void> {
  if (!subject.curriculumId || subject.curriculumChapter?.trim()) return;
  const [chapter] = await transaction
    .select({ id: curriculumChapters.id })
    .from(curriculumChapters)
    .where(eq(curriculumChapters.curriculumId, subject.curriculumId))
    .limit(1);
  if (chapter) {
    throw new Error("Select a chapter for the chosen curriculum.");
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

function mtuUsageFromDraft(input: z.infer<typeof draftInput>): MtuUsage {
  return normalizeMtuUsage({
    equipmentUsed: input.mtuEquipmentUsed,
    mileage: input.mtuMileage,
    usedSupplies: input.mtuUsedSupplies,
  });
}

async function replaceMtuUsage(
  transaction: DatabaseTransaction,
  classId: string,
  usage: MtuUsage,
): Promise<void> {
  if (hasMtuUsage(usage)) {
    await transaction
      .insert(mtuUsage)
      .values({ classId, ...usage })
      .onConflictDoUpdate({
        target: mtuUsage.classId,
        set: { ...usage, updatedAt: new Date() },
      });
  } else {
    await transaction.delete(mtuUsage).where(eq(mtuUsage.classId, classId));
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

export async function createOpenClass(
  db: Database,
  actor: ClassActor,
  input: z.input<typeof scheduledDraftInput>,
) {
  const parsed = scheduledDraftInput.parse(input);
  const endsAt = calculateComponentEndTime(
    parsed.startsAt,
    parsed.creditedHours,
  );
  validateComponentRange(parsed.startsAt, endsAt, parsed.creditedHours);
  const rawToken = generateClassSignInToken();
  return db.transaction(async (transaction) => {
    await validateReferences(transaction, parsed);
    const reportingSystemIds = parsed.reportingSystemIds ?? [];
    // The class name: the entered/EMS course name, else the first Fire subject.
    const className = parsed.name || parsed.subjects?.[0]?.className || null;
    const publicCode = await findAvailablePublicCode(transaction);
    const accessPin = parsed.accessPinEnabled ? generateClassAccessPin() : null;
    const now = new Date();

    const [created] = await transaction
      .insert(trainingClasses)
      .values({
        name: className,
        trainingSiteId: parsed.trainingSiteId ?? null,
        hostAgencyId: parsed.hostAgencyId,
        createdByUserId: actor.id,
        deliveryMethod: parsed.deliveryMethod,
        objectives: parsed.objectives || null,
        courseType: parsed.courseType || null,
        courseNumber: parsed.courseNumber || null,
        status: CLASS_STATUSES.OPEN,
        signInTokenHash: hashClassSignInToken(rawToken),
        signInTokenVersion: 1,
        publicCode,
        accessPinEnabled: parsed.accessPinEnabled,
        accessPinEncrypted: accessPin ? encryptClassAccessPin(accessPin) : null,
        openedAt: now,
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
    const [leadInstructor] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, parsed.leadInstructorId), eq(users.isActive, true)),
      )
      .limit(1);
    if (!leadInstructor) throw new Error("Select an active lead instructor.");
    await transaction.insert(classInstructors).values({
      classId: created.id,
      userId: parsed.leadInstructorId,
      isLead: true,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.instructor.assigned",
      entityType: "class",
      entityId: created.id,
      details: { userId: parsed.leadInstructorId, isLead: true },
    });
    // Each Fire subject becomes its own session. The first uses the class
    // schedule; a second subject is auto-placed immediately after it.
    const subjects = parsed.subjects ?? [];
    for (const subject of subjects) {
      await assertCurriculumChapter(transaction, subject);
    }
    const method = defaultComponentMethod(parsed.deliveryMethod);
    const componentValues = subjects.length
      ? subjects.map((subject, index) => {
          const subjectStartsAt = new Date(
            parsed.startsAt.getTime() +
              index * parsed.creditedHours * 60 * 60 * 1000,
          );
          return {
            classId: created.id,
            startsAt: subjectStartsAt,
            endsAt: calculateComponentEndTime(
              subjectStartsAt,
              parsed.creditedHours,
            ),
            creditedHours: String(parsed.creditedHours),
            position: index,
            trainingCodeId: subject.trainingCodeId,
            className: subject.className,
            curriculumId: subject.curriculumId || null,
            curriculumName: subject.curriculumName || null,
            curriculumChapter: subject.curriculumChapter || null,
            lessonPlan: subject.lessonPlan || null,
            method,
          };
        })
      : [
          {
            classId: created.id,
            startsAt: parsed.startsAt,
            endsAt,
            creditedHours: String(parsed.creditedHours),
            position: 0,
            method,
          },
        ];
    if (
      new Set(
        componentValues.map((value) =>
          getDepartmentCalendarDate(value.startsAt),
        ),
      ).size > 1
    ) {
      throw new Error("All class sessions must occur on one roster day.");
    }
    const createdComponents = await transaction
      .insert(classComponents)
      .values(componentValues)
      .returning({ id: classComponents.id });
    if (createdComponents.length !== componentValues.length) {
      throw new Error("Class components were not created.");
    }
    for (const createdComponent of createdComponents) {
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        actorType: "user",
        action: "class.component.saved",
        entityType: "class",
        entityId: created.id,
        details: { componentId: createdComponent.id },
      });
    }
    await replaceMtuUsage(transaction, created.id, mtuUsageFromDraft(parsed));
    validateClassReadiness({
      componentCount: createdComponents.length,
      leadCount: 1,
      reportingCount: reportingSystemIds.length,
      hostAgencyActive: true,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.created",
      entityType: "class",
      entityId: created.id,
      details: {
        name: created.name,
        deliveryMethod: created.deliveryMethod,
      },
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.status.changed",
      entityType: "class",
      entityId: created.id,
      details: { from: null, to: CLASS_STATUSES.OPEN },
    });
    return { classRecord: created, rawToken, accessPin };
  });
}

export async function updateClass(
  db: Database,
  actor: ClassActor,
  classId: string,
  input: z.input<typeof draftInput>,
) {
  const parsed = draftInput.parse(input);
  return db.transaction(async (transaction) => {
    const existing = await requireClassAccess(transaction, actor, classId);
    assertClassEditable(existing.status);
    await validateReferences(transaction, parsed);
    const accessPin = parsed.accessPinEnabled
      ? existing.accessPinEnabled
        ? existing.accessPinEncrypted
        : encryptClassAccessPin(generateClassAccessPin())
      : null;
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        name: parsed.name || null,
        trainingSiteId: parsed.trainingSiteId ?? null,
        hostAgencyId: parsed.hostAgencyId,
        deliveryMethod: parsed.deliveryMethod,
        objectives: parsed.objectives || null,
        courseType: parsed.courseType || null,
        courseNumber: parsed.courseNumber || null,
        accessPinEnabled: parsed.accessPinEnabled,
        accessPinEncrypted: accessPin,
        updatedAt: new Date(),
      })
      .where(eq(trainingClasses.id, classId))
      .returning();
    if (!updated) throw new Error("Class was not updated.");
    // The KFS-1A Method follows the class delivery method, so re-derive it on
    // every session when the delivery method changes.
    if (existing.deliveryMethod !== parsed.deliveryMethod) {
      await transaction
        .update(classComponents)
        .set({
          method: defaultComponentMethod(parsed.deliveryMethod),
          updatedAt: new Date(),
        })
        .where(eq(classComponents.classId, classId));
    }
    await replaceReportingSystems(
      transaction,
      classId,
      parsed.reportingSystemIds ?? [],
    );
    await replaceMtuUsage(transaction, classId, mtuUsageFromDraft(parsed));
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
      details: { name: updated.name },
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
    assertClassEditable(classRecord.status);
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
      trainingCodeId: parsed.trainingCodeId || null,
      className: parsed.className || null,
      curriculumId: parsed.curriculumId || null,
      curriculumName: parsed.curriculumName || null,
      curriculumChapter: parsed.curriculumChapter || null,
      lessonPlan: parsed.lessonPlan || null,
      method: parsed.method || null,
      updatedAt: new Date(),
    };
    await assertCurriculumChapter(transaction, parsed);
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
    assertClassEditable(classRecord.status);
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
    // Completing closes public sign-in and enters roster review. Roster
    // readiness is enforced once, at finalization, so an operator can complete
    // a class and then correct it on the review screen.
    const publicCode = current.publicCode;
    const now = new Date();
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        status: nextStatus,
        cancellationReason:
          nextStatus === CLASS_STATUSES.CANCELLED
            ? cancellationReason?.trim()
            : null,
        openedAt: current.openedAt,
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

export const PUBLIC_DIRECTORY_OPENS_BEFORE_HOURS = 18;
export const PUBLIC_DIRECTORY_CLOSES_AFTER_HOURS = 36;

function formatPublicInstructorName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0]?.[0] ?? ""}. ${parts.at(-1) ?? ""}`
    : displayName;
}

export async function listPublicOpenClasses(db: Database) {
  const records = await db
    .select({
      id: trainingClasses.id,
      publicCode: trainingClasses.publicCode,
      courseName: trainingClasses.name,
      deliveryMethod: trainingClasses.deliveryMethod,
      siteName: trainingSites.name,
    })
    .from(trainingClasses)
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
    .orderBy(trainingClasses.name)
    .limit(100);

  const classIds = records.map((record) => record.id);
  if (classIds.length === 0) return [];

  const [componentRows, instructorRows] = await Promise.all([
    db
      .select({
        classId: classComponents.classId,
        startsAt: classComponents.startsAt,
      })
      .from(classComponents)
      .where(inArray(classComponents.classId, classIds))
      .orderBy(asc(classComponents.startsAt)),
    db
      .select({
        classId: classInstructors.classId,
        displayName: users.displayName,
      })
      .from(classInstructors)
      .innerJoin(users, eq(users.id, classInstructors.userId))
      .where(inArray(classInstructors.classId, classIds))
      .orderBy(
        asc(classInstructors.classId),
        sql`${classInstructors.isLead} desc`,
        asc(users.displayName),
      ),
  ]);

  const nextSessionByClass = new Map<string, Date>();
  for (const row of componentRows) {
    if (!nextSessionByClass.has(row.classId)) {
      nextSessionByClass.set(row.classId, row.startsAt);
    }
  }
  const instructorsByClass = new Map<string, string[]>();
  for (const row of instructorRows) {
    const names = instructorsByClass.get(row.classId) ?? [];
    names.push(formatPublicInstructorName(row.displayName));
    instructorsByClass.set(row.classId, names);
  }

  const now = new Date();
  const windowOpensAt = new Date(
    now.getTime() - PUBLIC_DIRECTORY_CLOSES_AFTER_HOURS * 60 * 60 * 1000,
  );
  const windowClosesAt = new Date(
    now.getTime() + PUBLIC_DIRECTORY_OPENS_BEFORE_HOURS * 60 * 60 * 1000,
  );

  return records.flatMap((record) => {
    const publicCode = record.publicCode;
    if (!publicCode) throw new Error("Open class is missing public access.");
    const nextSession = nextSessionByClass.get(record.id) ?? null;
    if (
      !nextSession ||
      nextSession < windowOpensAt ||
      nextSession > windowClosesAt
    ) {
      return [];
    }
    return [
      {
        publicCode,
        courseName: record.courseName,
        location:
          record.deliveryMethod === "online"
            ? "Virtual"
            : (record.siteName ?? ""),
        nextSession,
        instructors: instructorsByClass.get(record.id) ?? [],
      },
    ];
  });
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

export const CLASS_LIST_DEFAULT_LOOKBACK_DAYS = 30;
export const CLASS_LIST_FINALIZED_GRACE_DAYS = 7;
export const CLASS_LIST_LIMIT = 200;

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface ClassListFilters {
  query?: string;
  status?: ClassStatus;
  from?: Date;
  to?: Date;
  includeFinalized?: boolean;
  includeCancelled?: boolean;
}

export async function listClasses(
  db: Database,
  actor: ClassActor,
  filters: ClassListFilters = {},
) {
  const elevated = await db.transaction((transaction) =>
    canManageAllClasses(transaction, actor.id),
  );
  const term = `%${(filters.query ?? "").trim()}%`;
  const now = new Date();
  const finalizedCutoff = new Date(
    now.getTime() - CLASS_LIST_FINALIZED_GRACE_DAYS * DAY_IN_MILLISECONDS,
  );
  const windowStart =
    filters.from ??
    new Date(
      now.getTime() - CLASS_LIST_DEFAULT_LOOKBACK_DAYS * DAY_IN_MILLISECONDS,
    );
  const access = elevated
    ? undefined
    : or(
        eq(trainingClasses.createdByUserId, actor.id),
        sql`exists (select 1 from ${classInstructors} where ${classInstructors.classId} = ${trainingClasses.id} and ${classInstructors.userId} = ${actor.id})`,
      );

  const firstSessionStartsAt = sql<Date | null>`(
    select min(${classComponents.startsAt}) from ${classComponents}
    where ${classComponents.classId} = ${trainingClasses.id}
  )`;
  const finalSessionEndsAt = sql<Date | null>`(
    select max(${classComponents.endsAt}) from ${classComponents}
    where ${classComponents.classId} = ${trainingClasses.id}
  )`;
  const finalizedAt = sql<Date | null>`(
    select max(${finalizationRevisions.finalizedAt}) from ${finalizationRevisions}
    where ${finalizationRevisions.classId} = ${trainingClasses.id}
  )`;
  const attendanceCount = sql<number>`(
    select count(*)::int from ${attendance}
    where ${attendance.classId} = ${trainingClasses.id}
      and ${attendance.removedAt} is null
  )`;

  const defaultScope = or(
    eq(trainingClasses.status, CLASS_STATUSES.OPEN),
    eq(trainingClasses.status, CLASS_STATUSES.COMPLETED),
    filters.includeFinalized
      ? eq(trainingClasses.status, CLASS_STATUSES.FINALIZED)
      : and(
          eq(trainingClasses.status, CLASS_STATUSES.FINALIZED),
          gte(finalizedAt, finalizedCutoff),
        ),
    filters.includeCancelled
      ? eq(trainingClasses.status, CLASS_STATUSES.CANCELLED)
      : undefined,
  );

  const workInFlight = and(
    or(
      eq(trainingClasses.status, CLASS_STATUSES.OPEN),
      eq(trainingClasses.status, CLASS_STATUSES.COMPLETED),
    ),
    gt(attendanceCount, 0),
  );

  const rows = await db
    .select({
      id: trainingClasses.id,
      status: trainingClasses.status,
      deliveryMethod: trainingClasses.deliveryMethod,
      courseName: trainingClasses.name,
      siteName: trainingSites.name,
      createdAt: trainingClasses.createdAt,
      updatedAt: trainingClasses.updatedAt,
      firstSessionStartsAt,
      finalSessionEndsAt,
      finalizedAt,
      attendanceCount,
    })
    .from(trainingClasses)
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        or(ilike(trainingClasses.name, term), ilike(trainingSites.name, term)),
        access,
        filters.status
          ? eq(trainingClasses.status, filters.status)
          : defaultScope,
        or(
          isNull(firstSessionStartsAt),
          and(
            gte(firstSessionStartsAt, windowStart),
            filters.to ? lte(firstSessionStartsAt, filters.to) : undefined,
          ),
          workInFlight,
        ),
      ),
    )
    .orderBy(
      desc(
        sql`coalesce(${firstSessionStartsAt}, ${trainingClasses.createdAt})`,
      ),
    )
    .limit(CLASS_LIST_LIMIT);

  return rows.map((row) => {
    const normalizedFinalSessionEndsAt = asDate(
      row.finalSessionEndsAt as Date | string | null,
    );
    return {
      ...row,
      createdAt: asDate(row.createdAt as Date | string | null),
      firstSessionStartsAt: asDate(
        row.firstSessionStartsAt as Date | string | null,
      ),
      finalSessionEndsAt: normalizedFinalSessionEndsAt,
      finalizedAt: asDate(row.finalizedAt as Date | string | null),
      isOverdue: isOverdueRoster(row.status, normalizedFinalSessionEndsAt, now),
    };
  });
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
      courseName: trainingClasses.name,
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
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        inArray(trainingClasses.status, [
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
    const site = classRecord.trainingSiteId
      ? await transaction
          .select({ id: trainingSites.id, name: trainingSites.name })
          .from(trainingSites)
          .where(eq(trainingSites.id, classRecord.trainingSiteId))
          .limit(1)
      : [];
    const hostAgency = await transaction
      .select({ id: agencies.id, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.id, classRecord.hostAgencyId))
      .limit(1);
    const components = await transaction
      .select()
      .from(classComponents)
      .where(eq(classComponents.classId, classId))
      .orderBy(asc(classComponents.startsAt), asc(classComponents.position));
    const instructors = await transaction
      .select({
        userId: users.id,
        displayName: users.displayName,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .innerJoin(users, eq(users.id, classInstructors.userId))
      .where(eq(classInstructors.classId, classId))
      .orderBy(sql`${classInstructors.isLead} desc`, users.displayName);
    const systems = await transaction
      .select({
        id: reportingSystems.id,
        code: reportingSystems.code,
        name: reportingSystems.name,
      })
      .from(classReportingSystems)
      .innerJoin(
        reportingSystems,
        eq(reportingSystems.id, classReportingSystems.reportingSystemId),
      )
      .where(eq(classReportingSystems.classId, classId))
      .orderBy(reportingSystems.name);
    const [mtu] = await transaction
      .select()
      .from(mtuUsage)
      .where(eq(mtuUsage.classId, classId))
      .limit(1);
    return {
      ...classRecord,
      site: site[0] ?? null,
      hostAgency: hostAgency[0] ?? null,
      components,
      instructors,
      reportingSystems: systems,
      mtuUsage: mtu ?? null,
    };
  });
}

export async function listClassFormOptions(db: Database, actor?: ClassActor) {
  const [
    siteRows,
    agencyRows,
    systemRows,
    staffRows,
    requirementRows,
    trainingCodeRows,
    curriculumRows,
    curriculumChapterRows,
  ] = await Promise.all([
    db
      .select({ id: trainingSites.id, name: trainingSites.name })
      .from(trainingSites)
      .where(eq(trainingSites.isActive, true))
      .orderBy(trainingSites.name),
    db
      .select({ id: agencies.id, name: agencies.name })
      .from(agencies)
      .where(eq(agencies.isActive, true))
      .orderBy(agencies.name),
    db
      .select({
        id: reportingSystems.id,
        code: reportingSystems.code,
        name: reportingSystems.name,
      })
      .from(reportingSystems)
      .where(eq(reportingSystems.isActive, true))
      .orderBy(reportingSystems.name),
    db
      .select({ id: users.id, name: users.displayName })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.displayName),
    db
      .select({
        reportingSystemId: reportingRequirementSets.reportingSystemId,
        kind: reportingRequirements.kind,
        credentialName: credentialTypes.name,
        studentField: reportingRequirements.studentField,
        isRequired: reportingRequirements.isRequired,
      })
      .from(reportingRequirements)
      .innerJoin(
        reportingRequirementSets,
        eq(reportingRequirementSets.id, reportingRequirements.requirementSetId),
      )
      .leftJoin(
        credentialTypes,
        eq(credentialTypes.id, reportingRequirements.credentialTypeId),
      )
      .where(eq(reportingRequirementSets.isActive, true)),
    db
      .select({
        id: trainingCodes.id,
        code: trainingCodes.code,
        title: trainingCodes.title,
      })
      .from(trainingCodes)
      .where(eq(trainingCodes.isActive, true))
      .orderBy(trainingCodes.code),
    db
      .select({
        id: curricula.id,
        publisher: curricula.publisher,
        programTitle: curricula.programTitle,
        version: curricula.version,
      })
      .from(curricula)
      .where(eq(curricula.isActive, true))
      .orderBy(curricula.publisher, curricula.programTitle),
    db
      .select({
        id: curriculumChapters.id,
        curriculumId: curriculumChapters.curriculumId,
        part: curriculumChapters.part,
        number: curriculumChapters.number,
        title: curriculumChapters.title,
        position: curriculumChapters.position,
      })
      .from(curriculumChapters)
      .where(eq(curriculumChapters.isActive, true))
      .orderBy(curriculumChapters.curriculumId, curriculumChapters.position),
  ]);
  const recentRows = actor
    ? await db
        .select({
          trainingSiteId: trainingClasses.trainingSiteId,
        })
        .from(trainingClasses)
        .where(
          or(
            eq(trainingClasses.createdByUserId, actor.id),
            sql`exists (select 1 from ${classInstructors} where ${classInstructors.classId} = ${trainingClasses.id} and ${classInstructors.userId} = ${actor.id})`,
          ),
        )
        .orderBy(desc(trainingClasses.updatedAt))
        .limit(10)
    : [];
  // Curricula the actor used most recently, mirroring the recent sites. A class
  // can hold up to two subjects, so the window is doubled before de-duplication.
  const recentCurriculumRows = actor
    ? await db
        .select({ curriculumId: classComponents.curriculumId })
        .from(classComponents)
        .innerJoin(
          trainingClasses,
          eq(trainingClasses.id, classComponents.classId),
        )
        .where(
          and(
            isNotNull(classComponents.curriculumId),
            or(
              eq(trainingClasses.createdByUserId, actor.id),
              sql`exists (select 1 from ${classInstructors} where ${classInstructors.classId} = ${trainingClasses.id} and ${classInstructors.userId} = ${actor.id})`,
            ),
          ),
        )
        .orderBy(desc(trainingClasses.updatedAt))
        .limit(20)
    : [];
  return {
    sites: siteRows,
    agencies: agencyRows,
    reportingSystems: systemRows,
    staff: staffRows,
    reportingRequirements: requirementRows,
    trainingCodes: trainingCodeRows,
    curricula: curriculumRows,
    curriculumChapters: curriculumChapterRows,
    recentSiteIds: [
      ...new Set(
        recentRows.flatMap((row) =>
          row.trainingSiteId ? [row.trainingSiteId] : [],
        ),
      ),
    ],
    recentCurriculumIds: [
      ...new Set(
        recentCurriculumRows.flatMap((row) =>
          row.curriculumId ? [row.curriculumId] : [],
        ),
      ),
    ],
  };
}

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
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { participantsFollowingRaisedTotal } from "@/modules/instructor-roster/services";
import { REPORTING_SYSTEM_CODES } from "@/modules/reference/constants";
import { reconcileAttendanceReportingContexts } from "@/modules/reporting-contexts/service";
import { getInitialCertTei } from "@/modules/settings/services";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  classComponents,
  classInstructors,
  classMtuUsageItems,
  classReportingSystems,
  credentialTypes,
  curricula,
  curriculumChapters,
  finalizationFireAttestations,
  finalizationRevisions,
  mtuCatalogItems,
  mtuUsage,
  reportingRequirementSets,
  reportingSystems,
  revisionAttestations,
  roles,
  trainingClasses,
  trainingCodes,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";

import { CLASS_STATUSES, type ClassStatus } from "./constants";
import {
  defaultComponentMethod,
  deliveryMethodsFromComponentMethods,
  formatComponentMethod,
  formatDeliveryMethods,
} from "./delivery-methods";
import { deriveRecentInitialCertNumbers } from "./initial-cert-code";
import { requireFireInstructor } from "./instructor-ffn";
import {
  estimateSupplyQuantity,
  hasMtuUsage,
  MTU_ITEM_SOURCES,
  type MtuConsumptionRule,
  type MtuItemSource,
  type MtuUsage,
  type MtuUsageInput,
  type MtuUsageItem,
  type MtuUsageText,
  normalizeMtuUsage,
  parseTransportMileage,
} from "./mtu";
import {
  assertClassEditable,
  calculateComponentEndTime,
  validateClassReadiness,
  validateClassTransition,
  validateComponentRange,
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

export type OperationalClassAction =
  | "roster"
  | "finalize"
  | "sign_fire"
  | "view";

export function getOperationalClassAction(
  status: string,
  fireSignaturePending = false,
): OperationalClassAction {
  if (status === CLASS_STATUSES.OPEN) return "roster";
  if (status === "finalized" && fireSignaturePending) return "sign_fire";
  return "view";
}

export function isOverdueRoster(
  status: string,
  finalSessionEndsAt: Date | null,
  now = new Date(),
): boolean {
  return (
    status === CLASS_STATUSES.OPEN &&
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

const mtuSupplySelectionInput = z.object({
  itemId: z.string().uuid(),
  quantity: z.union([z.string(), z.number()]).optional(),
});

const draftInput = z.object({
  name: z.string().trim().max(200).default(""),
  trainingSiteId: z.string().uuid(),
  hostAgencyId: z.string().uuid(),
  deliveryMethod: z
    .string()
    .transform((value) => formatDeliveryMethods(value))
    .refine(
      (value) => value.length > 0,
      "Select at least one delivery method.",
    ),
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
  emsCategoryId: z.union([z.string().uuid(), z.literal("")]).optional(),
  mtuEquipmentUsed: z.string().trim().max(500).default(""),
  mtuMileage: z.string().trim().max(200).default(""),
  mtuUsedSupplies: z.string().trim().max(500).default(""),
  mtuEquipmentIds: z.array(z.string().uuid()).optional().default([]),
  mtuSupplyItems: z.array(mtuSupplySelectionInput).optional().default([]),
  mtuTransportIds: z.array(z.string().uuid()).optional().default([]),
  mtuTransportMileage: z.record(z.string().uuid(), z.string()).default({}),
  // When false the caller does not manage MTU usage — for example the review
  // workspace's class card — so an update leaves recorded usage untouched.
  mtuManaged: z.boolean().default(true),
});

const optionalUuid = z.union([z.string().uuid(), z.literal("")]).optional();
// Stored KFS-1A Method values: any non-empty canonical subset of cr,ho,ol.
// Omitted means "leave an existing session unchanged" or "use the class
// default" for a new session.
const optionalMethod = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined ? undefined : formatComponentMethod(value),
  )
  .refine(
    (value) => value === undefined || value !== null,
    "Select at least one method.",
  );

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
  assistantInstructorId: optionalUuid,
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
  const [hostAgency] = await transaction
    .select({ id: agencies.id })
    .from(agencies)
    .where(
      and(eq(agencies.id, input.hostAgencyId), eq(agencies.isActive, true)),
    )
    .limit(1);
  if (!hostAgency) throw new Error("Select an active host agency.");

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
 * A KBEMS class must carry the EMS details its roster and certificate need.
 * Enforced at creation only; the completed-class edit path does not collect
 * these fields.
 */
async function assertKbemsCourseDetails(
  transaction: DatabaseTransaction,
  input: z.infer<typeof scheduledDraftInput>,
): Promise<void> {
  const ids = input.reportingSystemIds ?? [];
  if (ids.length === 0) return;
  const [kbems] = await transaction
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(
      and(
        inArray(reportingSystems.id, ids),
        eq(reportingSystems.code, REPORTING_SYSTEM_CODES.KBEMS),
      ),
    )
    .limit(1);
  if (!kbems) return;
  if (!input.name.trim()) {
    throw new Error("Enter the EMS course name.");
  }
  if (!input.courseType) {
    throw new Error("Select a course type.");
  }
  if (!input.objectives.trim()) {
    throw new Error("Enter the course description or objectives.");
  }
  if (!input.emsCategoryId) {
    throw new Error("Select an EMS category.");
  }
  if (
    input.courseType === "initial_certification" &&
    !input.courseNumber.trim()
  ) {
    throw new Error(
      "Enter the course number for an initial-certification class.",
    );
  }
}

/**
 * MTU records resource usage only and produces no participant output, so a
 * class must also report to an accreditation destination. Enforced on creation
 * and on edit so an MTU-only class can never be created or saved.
 */
async function assertMtuDestinationPaired(
  transaction: DatabaseTransaction,
  reportingSystemIds: string[],
): Promise<void> {
  if (reportingSystemIds.length === 0) return;
  const systems = await transaction
    .select({ code: reportingSystems.code })
    .from(reportingSystems)
    .where(inArray(reportingSystems.id, reportingSystemIds));
  const codes = new Set(systems.map((system) => system.code));
  if (
    codes.has(REPORTING_SYSTEM_CODES.MTU) &&
    !codes.has(REPORTING_SYSTEM_CODES.FIRE) &&
    !codes.has(REPORTING_SYSTEM_CODES.KBEMS)
  ) {
    throw new Error("Select Fire or KBEMS alongside the Mobile Training Unit.");
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

async function selectsFireDestination(
  transaction: DatabaseTransaction,
  reportingSystemIds: string[],
): Promise<boolean> {
  if (reportingSystemIds.length === 0) return false;
  const [fire] = await transaction
    .select({ id: reportingSystems.id })
    .from(reportingSystems)
    .where(
      and(
        inArray(reportingSystems.id, reportingSystemIds),
        eq(reportingSystems.code, REPORTING_SYSTEM_CODES.FIRE),
      ),
    )
    .limit(1);
  return Boolean(fire);
}

async function classSelectsFire(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<boolean> {
  const [fire] = await transaction
    .select({ id: reportingSystems.id })
    .from(classReportingSystems)
    .innerJoin(
      reportingSystems,
      eq(reportingSystems.id, classReportingSystems.reportingSystemId),
    )
    .where(
      and(
        eq(classReportingSystems.classId, classId),
        eq(reportingSystems.code, REPORTING_SYSTEM_CODES.FIRE),
      ),
    )
    .limit(1);
  return Boolean(fire);
}

async function assignedInstructorIds(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<string[]> {
  const assignments = await transaction
    .select({ id: classInstructors.userId })
    .from(classInstructors)
    .where(eq(classInstructors.classId, classId));
  return assignments.map(({ id }) => id);
}

function mtuUsageFromDraft(input: z.infer<typeof draftInput>): MtuUsageText {
  return normalizeMtuUsage({
    equipmentUsed: input.mtuEquipmentUsed,
    mileage: input.mtuMileage,
    usedSupplies: input.mtuUsedSupplies,
  });
}

function ruleFromCatalogItem(item: {
  perClassQty: string | null;
  perStudentQty: string | null;
  rounding: string | null;
}): MtuConsumptionRule {
  return {
    perClassQty: item.perClassQty === null ? null : Number(item.perClassQty),
    perStudentQty:
      item.perStudentQty === null ? null : Number(item.perStudentQty),
    rounding:
      item.rounding === "ceil" || item.rounding === "exact"
        ? item.rounding
        : null,
  };
}

function parseSelectionQuantity(
  value: string | number | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Supply quantities must be non-negative numbers.");
  }
  return parsed;
}

async function countActiveParticipants(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<number> {
  const [row] = await transaction
    .select({ count: sql<number>`count(*)::int` })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)));
  return row?.count ?? 0;
}

/**
 * Replaces a class's structured catalog selections. A supply whose submitted
 * quantity equals the current roster suggestion is stored as a suggestion
 * (recomputed while the class is open); a differing quantity is a manual
 * override. Equipment selections carry no quantity.
 */
async function replaceMtuUsageItems(
  transaction: DatabaseTransaction,
  classId: string,
  equipmentIds: string[],
  supplies: { itemId: string; quantity?: string | number }[],
  transportIds: string[] = [],
  transportMileage: Record<string, string> = {},
): Promise<void> {
  await transaction
    .delete(classMtuUsageItems)
    .where(eq(classMtuUsageItems.classId, classId));
  const uniqueEquipmentIds = [...new Set(equipmentIds)];
  const uniqueTransportIds = [...new Set(transportIds)];
  const supplyByItem = new Map<string, number | null>();
  for (const supply of supplies) {
    supplyByItem.set(supply.itemId, parseSelectionQuantity(supply.quantity));
  }
  const allIds = [
    ...new Set([
      ...uniqueEquipmentIds,
      ...uniqueTransportIds,
      ...supplyByItem.keys(),
    ]),
  ];
  if (allIds.length === 0) return;
  const catalogRows = await transaction
    .select()
    .from(mtuCatalogItems)
    .where(inArray(mtuCatalogItems.id, allIds));
  const byId = new Map(catalogRows.map((row) => [row.id, row]));
  const activeParticipantCount = await countActiveParticipants(
    transaction,
    classId,
  );
  const rows: {
    classId: string;
    itemId: string;
    quantity: string | null;
    mileage?: string | null;
    source: MtuItemSource;
  }[] = [];
  for (const itemId of uniqueEquipmentIds) {
    const item = byId.get(itemId);
    if (!item?.isActive || item.kind !== "equipment") {
      throw new Error("Selected MTU equipment is not available.");
    }
    rows.push({
      classId,
      itemId,
      quantity: null,
      source: MTU_ITEM_SOURCES.MANUAL,
    });
  }
  for (const itemId of uniqueTransportIds) {
    const item = byId.get(itemId);
    if (!item?.isActive || item.kind !== "transport") {
      throw new Error("Selected MTU transport is not available.");
    }
    rows.push({
      classId,
      itemId,
      quantity: null,
      mileage:
        parseTransportMileage(transportMileage[itemId])?.toString() ?? null,
      source: MTU_ITEM_SOURCES.MANUAL,
    });
  }
  for (const [itemId, submitted] of supplyByItem) {
    const item = byId.get(itemId);
    if (!item?.isActive || item.kind !== "supplies") {
      throw new Error("Selected MTU supply is not available.");
    }
    const suggestion = estimateSupplyQuantity(
      ruleFromCatalogItem(item),
      activeParticipantCount,
    );
    const isOverride = submitted !== null && submitted !== suggestion;
    const quantity = submitted === null ? suggestion : submitted;
    rows.push({
      classId,
      itemId,
      quantity: quantity.toString(),
      source: isOverride ? MTU_ITEM_SOURCES.MANUAL : MTU_ITEM_SOURCES.SUGGESTED,
    });
  }
  await transaction.insert(classMtuUsageItems).values(rows);
}

async function replaceMtuUsage(
  transaction: DatabaseTransaction,
  classId: string,
  usage: MtuUsageText,
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

/**
 * A class may only be created with a driving transport when a mileage estimate
 * is provided. This is a create-only rule: later edits, finalization, and usage
 * changes never enforce it, and mileage stays editable and clearable.
 */
async function assertCreationMileage(
  transaction: DatabaseTransaction,
  input: z.infer<typeof draftInput>,
): Promise<void> {
  const transportIds = input.mtuTransportIds ?? [];
  if (transportIds.length === 0) return;
  const rows = await transaction
    .select({
      id: mtuCatalogItems.id,
      name: mtuCatalogItems.name,
      requiresMileage: mtuCatalogItems.requiresMileage,
    })
    .from(mtuCatalogItems)
    .where(inArray(mtuCatalogItems.id, transportIds));
  for (const row of rows) {
    if (
      !row.requiresMileage ||
      parseTransportMileage(input.mtuTransportMileage[row.id]) !== null
    )
      continue;
    throw new Error(
      `Enter a mileage estimate for ${row.name} before creating the class.`,
    );
  }
}

export interface MtuUsageUpdateInput extends MtuUsageInput {
  equipmentIds?: string[];
  supplies?: { itemId: string; quantity?: string | number }[];
  transportIds?: string[];
  transportMileage?: Record<string, string>;
}

export async function updateClassMtuUsage(
  db: Database,
  actor: ClassActor,
  classId: string,
  input: MtuUsageUpdateInput,
) {
  const usage = normalizeMtuUsage(input);
  return db.transaction(async (transaction) => {
    // Class access is required, but operational usage is not a signed fact. It
    // is edited only while the class is open; after finalization it changes
    // through the reopen path.
    const classRecord = await requireClassAccess(transaction, actor, classId);
    assertClassEditable(classRecord.status);
    await replaceMtuUsage(transaction, classId, usage);
    // Only touch structured selections when the caller supplies them, so a
    // free-text-only update never wipes catalog picks.
    if (
      input.equipmentIds !== undefined ||
      input.supplies !== undefined ||
      input.transportIds !== undefined
    ) {
      await replaceMtuUsageItems(
        transaction,
        classId,
        input.equipmentIds ?? [],
        input.supplies ?? [],
        input.transportIds ?? [],
        input.transportMileage,
      );
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.mtu_usage.updated",
      entityType: "class",
      entityId: classId,
      details: { fields: ["equipmentUsed", "mileage", "usedSupplies"] },
    });
  });
}

/**
 * Freezes suggestions into stored manual quantities. Called inside the
 * finalization transaction so a locked roster stops recomputing.
 */
export async function resolveMtuUsageItemsForFinalization(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<void> {
  const rows = await transaction
    .select({
      itemId: classMtuUsageItems.itemId,
      source: classMtuUsageItems.source,
      perClassQty: mtuCatalogItems.perClassQty,
      perStudentQty: mtuCatalogItems.perStudentQty,
      rounding: mtuCatalogItems.rounding,
    })
    .from(classMtuUsageItems)
    .innerJoin(
      mtuCatalogItems,
      eq(mtuCatalogItems.id, classMtuUsageItems.itemId),
    )
    .where(
      and(
        eq(classMtuUsageItems.classId, classId),
        eq(classMtuUsageItems.source, MTU_ITEM_SOURCES.SUGGESTED),
      ),
    );
  if (rows.length === 0) return;
  const activeParticipantCount = await countActiveParticipants(
    transaction,
    classId,
  );
  for (const row of rows) {
    const quantity = estimateSupplyQuantity(
      ruleFromCatalogItem(row),
      activeParticipantCount,
    );
    await transaction
      .update(classMtuUsageItems)
      .set({
        quantity: quantity.toString(),
        source: MTU_ITEM_SOURCES.MANUAL,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(classMtuUsageItems.classId, classId),
          eq(classMtuUsageItems.itemId, row.itemId),
        ),
      );
  }
}

/**
 * Applies the lead instructor's confirmed MTU usage and freezes any remaining
 * suggestions. Runs inside the finalization transaction and writes only the
 * operational usage tables, so participant count and revision number are
 * unaffected.
 */
export async function confirmMtuUsageForFinalization(
  transaction: DatabaseTransaction,
  classId: string,
  input: {
    equipmentIds: string[];
    supplies: { itemId: string; quantity?: string | number }[];
    transportIds: string[];
    transportMileage?: Record<string, string>;
    equipmentUsed?: string;
    usedSupplies?: string;
    mileage?: string;
  },
): Promise<void> {
  await replaceMtuUsage(
    transaction,
    classId,
    normalizeMtuUsage({
      equipmentUsed: input.equipmentUsed ?? "",
      mileage: input.mileage ?? "",
      usedSupplies: input.usedSupplies ?? "",
    }),
  );
  await replaceMtuUsageItems(
    transaction,
    classId,
    input.equipmentIds,
    input.supplies,
    input.transportIds,
    input.transportMileage,
  );
  await resolveMtuUsageItemsForFinalization(transaction, classId);
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
    await assertMtuDestinationPaired(
      transaction,
      parsed.reportingSystemIds ?? [],
    );
    await assertKbemsCourseDetails(transaction, parsed);
    const reportingSystemIds = parsed.reportingSystemIds ?? [];
    const [leadInstructor] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, parsed.leadInstructorId), eq(users.isActive, true)),
      )
      .limit(1);
    if (!leadInstructor) throw new Error("Select an active lead instructor.");
    const assistantInstructorId = parsed.assistantInstructorId ?? null;
    if (assistantInstructorId === parsed.leadInstructorId) {
      throw new Error(
        "The assistant instructor must be different from the lead instructor.",
      );
    }
    if (assistantInstructorId) {
      const [assistantInstructor] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.id, assistantInstructorId), eq(users.isActive, true)),
        )
        .limit(1);
      if (!assistantInstructor) {
        throw new Error("Select an active assistant instructor.");
      }
    }
    const instructorIds = assistantInstructorId
      ? [parsed.leadInstructorId, assistantInstructorId]
      : [parsed.leadInstructorId];
    if (await selectsFireDestination(transaction, reportingSystemIds)) {
      await requireFireInstructor(transaction, instructorIds);
    }
    // The class name: the entered/EMS course name, else the first Fire subject.
    const className = parsed.name || parsed.subjects?.[0]?.className || null;
    const publicCode = await findAvailablePublicCode(transaction);
    const accessPin = parsed.accessPinEnabled ? generateClassAccessPin() : null;
    const now = new Date();

    const [created] = await transaction
      .insert(trainingClasses)
      .values({
        name: className,
        trainingSiteId: parsed.trainingSiteId,
        hostAgencyId: parsed.hostAgencyId,
        createdByUserId: actor.id,
        deliveryMethod: parsed.deliveryMethod,
        objectives: parsed.objectives || null,
        courseType: parsed.courseType || null,
        courseNumber: parsed.courseNumber || null,
        emsCategoryId: parsed.emsCategoryId || null,
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
    await transaction.insert(classInstructors).values([
      {
        classId: created.id,
        userId: parsed.leadInstructorId,
        isLead: true,
      },
      ...(assistantInstructorId
        ? [
            {
              classId: created.id,
              userId: assistantInstructorId,
              isLead: false,
            },
          ]
        : []),
    ]);
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.instructor.assigned",
      entityType: "class",
      entityId: created.id,
      details: {
        leadInstructorId: parsed.leadInstructorId,
        assistantInstructorId,
      },
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
    await assertCreationMileage(transaction, parsed);
    await replaceMtuUsage(transaction, created.id, mtuUsageFromDraft(parsed));
    await replaceMtuUsageItems(
      transaction,
      created.id,
      parsed.mtuEquipmentIds,
      parsed.mtuSupplyItems,
      parsed.mtuTransportIds,
      parsed.mtuTransportMileage,
    );
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
    await assertMtuDestinationPaired(
      transaction,
      parsed.reportingSystemIds ?? [],
    );
    if (
      (await selectsFireDestination(
        transaction,
        parsed.reportingSystemIds ?? [],
      )) &&
      !(await classSelectsFire(transaction, classId))
    ) {
      await requireFireInstructor(
        transaction,
        await assignedInstructorIds(transaction, classId),
      );
    }
    const accessPin = parsed.accessPinEnabled
      ? existing.accessPinEnabled
        ? existing.accessPinEncrypted
        : encryptClassAccessPin(generateClassAccessPin())
      : null;
    const [updated] = await transaction
      .update(trainingClasses)
      .set({
        name: parsed.name || null,
        trainingSiteId: parsed.trainingSiteId,
        hostAgencyId: parsed.hostAgencyId,
        deliveryMethod: parsed.deliveryMethod,
        objectives: parsed.objectives || null,
        courseType: parsed.courseType || null,
        courseNumber: parsed.courseNumber || null,
        emsCategoryId: parsed.emsCategoryId || null,
        accessPinEnabled: parsed.accessPinEnabled,
        accessPinEncrypted: accessPin,
        updatedAt: new Date(),
      })
      .where(eq(trainingClasses.id, classId))
      .returning();
    if (!updated) throw new Error("Class was not updated.");
    // A delivery change updates only sessions that still use the previous
    // default. Sessions an operator already changed (for example to hands-on)
    // keep their method.
    if (existing.deliveryMethod !== parsed.deliveryMethod) {
      const previousDefault = defaultComponentMethod(existing.deliveryMethod);
      const nextDefault = defaultComponentMethod(parsed.deliveryMethod);
      await transaction
        .update(classComponents)
        .set({ method: nextDefault, updatedAt: new Date() })
        .where(
          and(
            eq(classComponents.classId, classId),
            previousDefault
              ? eq(classComponents.method, previousDefault)
              : isNull(classComponents.method),
          ),
        );
    }
    await replaceReportingSystems(
      transaction,
      classId,
      parsed.reportingSystemIds ?? [],
    );
    await reconcileAttendanceReportingContexts(transaction, classId);
    if (parsed.mtuManaged) {
      await replaceMtuUsage(transaction, classId, mtuUsageFromDraft(parsed));
      await replaceMtuUsageItems(
        transaction,
        classId,
        parsed.mtuEquipmentIds,
        parsed.mtuSupplyItems,
        parsed.mtuTransportIds,
        parsed.mtuTransportMileage,
      );
    }
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

async function scheduledHoursTotal(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<number> {
  const [row] = await transaction
    .select({
      hours: sql<string>`coalesce(sum(${classComponents.creditedHours}), 0)`,
    })
    .from(classComponents)
    .where(eq(classComponents.classId, classId));
  return Number(row?.hours ?? 0);
}

/**
 * A class that ran long is recorded by raising the scheduled total. Every active
 * participant still credited at the previous total follows the new total, while
 * participants adjusted below the previous total keep their credited hours and
 * reason. Runs on the shared schedule write path so every editing surface agrees.
 */
async function carryRaisedScheduledTotal(
  transaction: DatabaseTransaction,
  actor: ClassActor,
  classId: string,
  previousTotal: number,
): Promise<void> {
  const newTotal = await scheduledHoursTotal(transaction, classId);
  if (!(newTotal > previousTotal)) return;
  const active = await transaction
    .select({ id: attendance.id, creditedHours: attendance.creditedHours })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)));
  const following = participantsFollowingRaisedTotal(
    active,
    previousTotal,
    newTotal,
  );
  for (const id of following) {
    await transaction
      .update(attendance)
      .set({
        creditedHours: String(newTotal),
        creditAdjustmentReason: null,
        creditAdjustedByUserId: null,
        creditAdjustedAt: null,
      })
      .where(eq(attendance.id, id));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "attendance.credit_followed_schedule",
      entityType: "attendance",
      entityId: id,
      details: { classId, creditedHours: newTotal, previousTotal },
    });
  }
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
    const previousTotal = await scheduledHoursTotal(transaction, classId);
    // A new session starts from the class delivery default. An omitted method
    // on an update leaves the existing method untouched.
    const method =
      parsed.method ??
      (parsed.id
        ? undefined
        : defaultComponentMethod(classRecord.deliveryMethod));
    if (!parsed.id && !method) {
      throw new Error("Select at least one method.");
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
      method,
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
    await carryRaisedScheduledTotal(transaction, actor, classId, previousTotal);
    return component;
  });
}

interface InstructorAssignmentInput {
  leadInstructorId: string;
  assistantInstructorId: string | null;
}

async function setClassInstructorsInTransaction(
  transaction: DatabaseTransaction,
  actor: ClassActor,
  classId: string,
  input: InstructorAssignmentInput,
) {
  const classRecord = await requireClassAccess(transaction, actor, classId);
  assertClassEditable(classRecord.status);
  const leadInstructorId = input.leadInstructorId;
  const assistantInstructorId = input.assistantInstructorId ?? null;
  if (!leadInstructorId) throw new Error("Select a lead instructor.");
  if (assistantInstructorId === leadInstructorId) {
    throw new Error(
      "The assistant instructor must be different from the lead instructor.",
    );
  }
  const instructorIds = assistantInstructorId
    ? [leadInstructorId, assistantInstructorId]
    : [leadInstructorId];
  const activeUsers = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, instructorIds), eq(users.isActive, true)));
  if (activeUsers.length !== instructorIds.length) {
    throw new Error("Select active staff instructors.");
  }
  if (await classSelectsFire(transaction, classId)) {
    await requireFireInstructor(transaction, instructorIds);
  }
  await transaction
    .delete(classInstructors)
    .where(eq(classInstructors.classId, classId));
  await transaction.insert(classInstructors).values([
    {
      classId,
      userId: leadInstructorId,
      isLead: true,
    },
    ...(assistantInstructorId
      ? [
          {
            classId,
            userId: assistantInstructorId,
            isLead: false,
          },
        ]
      : []),
  ]);
  await writeAuditLog(transaction, {
    actorUserId: actor.id,
    actorType: "user",
    action: "class.instructors.changed",
    entityType: "class",
    entityId: classId,
    details: { leadInstructorId, assistantInstructorId },
  });
  return { leadInstructorId, assistantInstructorId };
}

/**
 * The only instructor write path. It replaces the 1+1 assignment atomically so
 * the Fire guard validates the set that will exist after the write.
 */
export async function setClassInstructors(
  db: Database,
  actor: ClassActor,
  classId: string,
  input: InstructorAssignmentInput,
) {
  return db.transaction((transaction) =>
    setClassInstructorsInTransaction(transaction, actor, classId, input),
  );
}

export async function assignClassInstructor(
  db: Database,
  actor: ClassActor,
  classId: string,
  userId: string,
  isLead: boolean,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await requireClassAccess(transaction, actor, classId);
    const assignments = await transaction
      .select({
        userId: classInstructors.userId,
        isLead: classInstructors.isLead,
      })
      .from(classInstructors)
      .where(eq(classInstructors.classId, classId));
    const currentLead = assignments.find(
      (assignment) => assignment.isLead,
    )?.userId;
    const currentAssistant = assignments.find(
      (assignment) => !assignment.isLead,
    )?.userId;
    if (!isLead) {
      if (!currentLead) throw new Error("Assign a lead instructor first.");
      await setClassInstructorsInTransaction(transaction, actor, classId, {
        leadInstructorId: currentLead,
        assistantInstructorId: userId,
      });
      return;
    }
    await setClassInstructorsInTransaction(transaction, actor, classId, {
      leadInstructorId: userId,
      assistantInstructorId:
        currentAssistant === userId ? null : (currentAssistant ?? null),
    });
  });
}

export async function removeClassInstructor(
  db: Database,
  actor: ClassActor,
  classId: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (transaction) => {
    await requireClassAccess(transaction, actor, classId);
    const [assignment] = await transaction
      .select({ isLead: classInstructors.isLead })
      .from(classInstructors)
      .where(
        and(
          eq(classInstructors.classId, classId),
          eq(classInstructors.userId, userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!assignment) {
      throw new Error("That instructor is not assigned to this class.");
    }
    if (assignment.isLead) {
      throw new Error(
        "Replace the lead instructor instead of removing the lead.",
      );
    }
    const [lead] = await transaction
      .select({ userId: classInstructors.userId })
      .from(classInstructors)
      .where(
        and(
          eq(classInstructors.classId, classId),
          eq(classInstructors.isLead, true),
        ),
      )
      .limit(1);
    if (!lead) throw new Error("The class has no lead instructor.");
    await setClassInstructorsInTransaction(transaction, actor, classId, {
      leadInstructorId: lead.userId,
      assistantInstructorId: null,
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
        location: record.siteName ?? "",
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
    eq(trainingClasses.status, CLASS_STATUSES.OPEN),
    gt(attendanceCount, 0),
  );

  const pendingAttestationScope = sql<string | null>`(
    select case
      when revision.fire_signer_user_id is not null
        and not exists (
          select 1 from revision_attestations attestation
          where attestation.revision_id = revision.id and attestation.scope = 'fire'
        )
        and not exists (
          select 1 from finalization_fire_attestations legacy_fire
          where legacy_fire.revision_id = revision.id
        )
      then 'fire'
      when revision.signed_by_user_id is null
        and not exists (
          select 1 from revision_attestations roster_attestation
          where roster_attestation.revision_id = revision.id and roster_attestation.scope = 'roster'
        )
      then 'roster'
      else null
    end
    from finalization_revisions revision
    where revision.class_id = ${trainingClasses.id}
    order by revision.revision_number desc
    limit 1
  )`;

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
      pendingAttestationScope,
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

  const componentRows =
    rows.length === 0
      ? []
      : await db
          .select({
            classId: classComponents.classId,
            method: classComponents.method,
          })
          .from(classComponents)
          .where(
            inArray(
              classComponents.classId,
              rows.map((row) => row.id),
            ),
          );
  const componentMethodsByClass = new Map<string, Array<string | null>>();
  for (const component of componentRows) {
    const methods = componentMethodsByClass.get(component.classId) ?? [];
    methods.push(component.method);
    componentMethodsByClass.set(component.classId, methods);
  }

  return rows.map((row) => {
    const normalizedFinalSessionEndsAt = asDate(
      row.finalSessionEndsAt as Date | string | null,
    );
    return {
      ...row,
      deliveryMethod:
        deliveryMethodsFromComponentMethods(
          componentMethodsByClass.get(row.id) ?? [],
        ) || row.deliveryMethod,
      createdAt: asDate(row.createdAt as Date | string | null),
      firstSessionStartsAt: asDate(
        row.firstSessionStartsAt as Date | string | null,
      ),
      finalSessionEndsAt: normalizedFinalSessionEndsAt,
      finalizedAt: asDate(row.finalizedAt as Date | string | null),
      pendingAttestationScope: row.pendingAttestationScope as
        | "roster"
        | "fire"
        | null,
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
  const fireSignaturePendingSql = sql<boolean>`exists (
    select 1 from ${finalizationRevisions}
    where ${finalizationRevisions.classId} = ${trainingClasses.id}
      and ${finalizationRevisions.fireSignerUserId} is not null
      and ${finalizationRevisions.revisionNumber} = (
        select max(fr2.revision_number)
        from finalization_revisions fr2
        where fr2.class_id = ${trainingClasses.id}
      )
      and not exists (
        select 1 from ${revisionAttestations}
        where ${revisionAttestations.revisionId} = ${finalizationRevisions.id}
          and ${revisionAttestations.scope} = 'fire'
      )
      and not exists (
        select 1 from ${finalizationFireAttestations}
        where ${finalizationFireAttestations.revisionId} = ${finalizationRevisions.id}
      )
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
      fireSignerUserId: sql<string | null>`(
        select ${finalizationRevisions.fireSignerUserId}
        from ${finalizationRevisions}
        where ${finalizationRevisions.classId} = ${trainingClasses.id}
          and ${finalizationRevisions.revisionNumber} = (
            select max(fr2.revision_number)
            from finalization_revisions fr2
            where fr2.class_id = ${trainingClasses.id}
          )
      )`,
      fireSignaturePending: fireSignaturePendingSql,
    })
    .from(trainingClasses)
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(
      and(
        scope === "assigned" ? assigned : undefined,
        or(
          eq(trainingClasses.status, CLASS_STATUSES.OPEN),
          and(eq(trainingClasses.status, "finalized"), fireSignaturePendingSql),
        ),
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
      action: getOperationalClassAction(
        record.status,
        Boolean(
          record.fireSignaturePending && record.fireSignerUserId === actor.id,
        ),
      ),
      canSignFire: Boolean(
        record.fireSignaturePending && record.fireSignerUserId === actor.id,
      ),
      fireSignaturePending: Boolean(record.fireSignaturePending),
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
        ffn: users.ffn,
        instructorLevel: users.instructorLevel,
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
    const emsCategory = classRecord.emsCategoryId
      ? await transaction
          .select({ id: trainingCodes.id, title: trainingCodes.title })
          .from(trainingCodes)
          .where(eq(trainingCodes.id, classRecord.emsCategoryId))
          .limit(1)
      : [];
    const itemRows = await transaction
      .select({
        itemId: classMtuUsageItems.itemId,
        quantity: classMtuUsageItems.quantity,
        mileage: classMtuUsageItems.mileage,
        source: classMtuUsageItems.source,
        kind: mtuCatalogItems.kind,
        name: mtuCatalogItems.name,
        unitLabel: mtuCatalogItems.unitLabel,
        perClassQty: mtuCatalogItems.perClassQty,
        perStudentQty: mtuCatalogItems.perStudentQty,
        rounding: mtuCatalogItems.rounding,
        sortOrder: mtuCatalogItems.sortOrder,
      })
      .from(classMtuUsageItems)
      .innerJoin(
        mtuCatalogItems,
        eq(mtuCatalogItems.id, classMtuUsageItems.itemId),
      )
      .where(eq(classMtuUsageItems.classId, classId))
      .orderBy(
        mtuCatalogItems.kind,
        mtuCatalogItems.sortOrder,
        mtuCatalogItems.name,
      );
    const activeParticipantCount = await countActiveParticipants(
      transaction,
      classId,
    );
    const items: MtuUsageItem[] = itemRows.map((row) => {
      const isSupply = row.kind === "supplies";
      const kind: MtuUsageItem["kind"] =
        row.kind === "transport"
          ? "transport"
          : row.kind === "equipment"
            ? "equipment"
            : "supplies";
      const suggestion = isSupply
        ? estimateSupplyQuantity(
            ruleFromCatalogItem(row),
            activeParticipantCount,
          )
        : null;
      const source =
        row.source === MTU_ITEM_SOURCES.SUGGESTED
          ? MTU_ITEM_SOURCES.SUGGESTED
          : MTU_ITEM_SOURCES.MANUAL;
      const quantity = !isSupply
        ? null
        : source === MTU_ITEM_SOURCES.SUGGESTED
          ? suggestion
          : row.quantity === null
            ? null
            : Number(row.quantity);
      return {
        itemId: row.itemId,
        kind,
        name: row.name,
        unitLabel: row.unitLabel,
        quantity,
        mileage:
          kind === "transport" && row.mileage !== null
            ? Number(row.mileage)
            : null,
        suggestion,
        source,
      };
    });
    const usage: MtuUsage | null =
      mtu || items.length > 0
        ? {
            equipmentUsed: mtu?.equipmentUsed ?? null,
            mileage: mtu?.mileage ?? null,
            usedSupplies: mtu?.usedSupplies ?? null,
            items,
          }
        : null;
    return {
      ...classRecord,
      site: site[0] ?? null,
      hostAgency: hostAgency[0] ?? null,
      components,
      instructors,
      reportingSystems: systems,
      emsCategory: emsCategory[0] ?? null,
      mtuUsage: usage,
      mtuActiveParticipantCount: activeParticipantCount,
    };
  });
}

export async function listClassFormOptions(db: Database, actor?: ClassActor) {
  const [
    siteRows,
    agencyRows,
    systemRows,
    staffRows,
    inclusionRuleRows,
    trainingCodeRows,
    curriculumRows,
    curriculumChapterRows,
    mtuItemRows,
    recentInitialCertRows,
    defaultTeiNumber,
  ] = await Promise.all([
    db
      .select({
        id: trainingSites.id,
        name: trainingSites.name,
        isDefault: trainingSites.isDefault,
      })
      .from(trainingSites)
      .where(eq(trainingSites.isActive, true))
      .orderBy(trainingSites.name),
    db
      .select({
        id: agencies.id,
        name: agencies.name,
        isDefault: agencies.isDefault,
      })
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
      .select({
        id: users.id,
        name: users.displayName,
        ffn: users.ffn,
        instructorLevel: users.instructorLevel,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.displayName),
    db
      .select({
        reportingSystemId: reportingRequirementSets.reportingSystemId,
        inclusionMode: reportingRequirementSets.inclusionMode,
        credentialName: credentialTypes.name,
        credentialCode: credentialTypes.code,
      })
      .from(reportingRequirementSets)
      .leftJoin(
        credentialTypes,
        eq(
          credentialTypes.id,
          reportingRequirementSets.inclusionCredentialTypeId,
        ),
      )
      .where(eq(reportingRequirementSets.isActive, true)),
    db
      .select({
        id: trainingCodes.id,
        code: trainingCodes.code,
        title: trainingCodes.title,
        kind: trainingCodes.kind,
        isPinned: trainingCodes.isPinned,
        mapsToId: trainingCodes.mapsToId,
      })
      .from(trainingCodes)
      .where(eq(trainingCodes.isActive, true))
      .orderBy(
        trainingCodes.kind,
        desc(trainingCodes.isPinned),
        sql`lower(${trainingCodes.title})`,
      ),
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
    db
      .select({
        id: mtuCatalogItems.id,
        kind: mtuCatalogItems.kind,
        name: mtuCatalogItems.name,
        unitLabel: mtuCatalogItems.unitLabel,
        perClassQty: mtuCatalogItems.perClassQty,
        perStudentQty: mtuCatalogItems.perStudentQty,
        rounding: mtuCatalogItems.rounding,
        requiresMileage: mtuCatalogItems.requiresMileage,
      })
      .from(mtuCatalogItems)
      .where(eq(mtuCatalogItems.isActive, true))
      .orderBy(
        mtuCatalogItems.kind,
        mtuCatalogItems.sortOrder,
        mtuCatalogItems.name,
      ),
    db
      .select({ courseNumber: trainingClasses.courseNumber })
      .from(trainingClasses)
      .where(
        and(
          eq(trainingClasses.courseType, "initial_certification"),
          isNotNull(trainingClasses.courseNumber),
          ne(trainingClasses.courseNumber, ""),
        ),
      )
      .orderBy(desc(trainingClasses.updatedAt))
      .limit(100),
    getInitialCertTei(db),
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
    defaultTrainingSiteId: siteRows.find((site) => site.isDefault)?.id ?? null,
    defaultHostAgencyId:
      agencyRows.find((agency) => agency.isDefault)?.id ?? null,
    reportingSystems: systemRows,
    staff: staffRows,
    inclusionRules: inclusionRuleRows,
    trainingCodes: trainingCodeRows,
    curricula: curriculumRows,
    curriculumChapters: curriculumChapterRows,
    mtuCatalog: mtuItemRows,
    defaultTeiNumber,
    recentInitialCertNumbers: deriveRecentInitialCertNumbers(
      recentInitialCertRows,
    ),
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

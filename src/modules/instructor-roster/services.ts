import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import { listClassCredentialCorrections } from "@/modules/credential-correction/service";
import { reconcileAttendanceReportingContexts } from "@/modules/reporting-contexts/service";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  attendanceAttestations,
  attendanceReportingContexts,
  classComponents,
  classGuests,
  classInstructors,
  roles,
  students,
  trainingClasses,
  userRoles,
  users,
} from "@/server/db/schema";
import { ROLE_CODES } from "../staff-auth/permissions";
import { resolveClassRequirements } from "../student-sign-in/requirements";
import {
  computeRosterRefreshDeadline,
  type RosterRefreshPayload,
} from "./refresh";

export interface RosterActor {
  id: string;
  username: string;
}

export { CREDIT_ADJUSTMENT_REASONS } from "./constants";

export function hasElevatedRosterAccess(roleCodes: string[]): boolean {
  return roleCodes.some(
    (code) =>
      code === ROLE_CODES.ADMINISTRATOR || code === ROLE_CODES.TRAINING_MAJOR,
  );
}

/**
 * Asserts that the actor may read a class's roster outputs: elevated staff
 * (Administrator or Training Major) for any class, otherwise only a staff
 * member assigned to the class. Shared by the sign-in record and audit log.
 */
export async function assertClassRosterAccess(
  transaction: DatabaseTransaction,
  actor: { id: string },
  classId: string,
): Promise<void> {
  const elevated = await transaction
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, actor.id), eq(roles.isActive, true)));
  if (hasElevatedRosterAccess(elevated.map((row) => row.code))) return;
  const [assigned] = await transaction
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .limit(1);
  if (!assigned) throw new Error("Class roster access denied.");
}

export function validateCreditedHours(
  creditedHours: number,
  scheduledHours: number,
  reason?: string,
): void {
  if (
    !Number.isFinite(creditedHours) ||
    creditedHours < 0 ||
    creditedHours > scheduledHours
  ) {
    throw new Error(
      "Credited hours must be between zero and the scheduled total.",
    );
  }
  if (creditedHours !== scheduledHours && !reason?.trim()) {
    throw new Error(
      "A reason is required when credited hours differ from scheduled hours.",
    );
  }
}

/**
 * The active participants who follow a raised class scheduled total: those still
 * credited at the previous total. Participants adjusted below the previous total
 * (with a reason) keep their credited hours, so a class that runs long credits
 * only the people who were present for the full session.
 */
export function participantsFollowingRaisedTotal(
  participants: ReadonlyArray<{ id: string; creditedHours: string | null }>,
  previousTotal: number,
  newTotal: number,
): string[] {
  if (!(newTotal > previousTotal)) return [];
  return participants
    .filter(
      (participant) => Number(participant.creditedHours) === previousTotal,
    )
    .map((participant) => participant.id);
}

/** A participant's display name for roster messages, never an internal id. */
export function participantLabel(entry: {
  studentId: string | null;
  firstName: string | null;
  lastName: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
}): string {
  const name = entry.studentId
    ? `${entry.firstName ?? ""} ${entry.lastName ?? ""}`
    : `${entry.guestFirstName ?? ""} ${entry.guestLastName ?? ""}`;
  return name.trim() || "A participant";
}

/** A roster-readiness issue that names the participant it concerns. */
export function readinessIssue(
  name: string,
  problem: "credit" | "context",
): string {
  return problem === "credit"
    ? `${name} has invalid credited hours.`
    : `${name} is missing required reporting context.`;
}

export async function getScheduledClassHours(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<number> {
  const [row] = await transaction
    .select({
      hours: sql<string>`coalesce(sum(${classComponents.creditedHours}), 0)`,
    })
    .from(classComponents)
    .where(eq(classComponents.classId, classId));
  const hours = Number(row?.hours ?? 0);
  if (!Number.isFinite(hours) || hours <= 0)
    throw new Error("Class schedule is unavailable.");
  return hours;
}

async function requireAssignedInstructor(
  transaction: DatabaseTransaction,
  actor: RosterActor,
  classId: string,
  lock = true,
) {
  const classQuery = transaction
    .select()
    .from(trainingClasses)
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const [classRecord] = lock
    ? await classQuery.for("update")
    : await classQuery;
  if (!classRecord) throw new Error("Roster unavailable.");

  const elevated = await transaction
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, actor.id),
        eq(roles.isActive, true),
        sql`${roles.code} in (${ROLE_CODES.ADMINISTRATOR}, ${ROLE_CODES.TRAINING_MAJOR})`,
      ),
    )
    .limit(1);
  if (hasElevatedRosterAccess(elevated.map((role) => role.code))) {
    return classRecord;
  }
  if (classRecord.createdByUserId === actor.id) return classRecord;
  const query = transaction
    .select()
    .from(trainingClasses)
    .innerJoin(
      classInstructors,
      and(
        eq(classInstructors.classId, trainingClasses.id),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;
  if (!row) throw new Error("Roster unavailable.");
  return row.classes;
}

function requireMutableRosterClass(classRecord: { status: string }) {
  if (classRecord.status !== CLASS_STATUSES.OPEN) {
    throw new Error("Attendance can only be changed while the class is open.");
  }
}

export async function removeAttendance(
  db: Database,
  actor: RosterActor,
  attendanceId: string,
  reason: string,
  now = new Date(),
) {
  if (!reason.trim()) throw new Error("A removal reason is required.");
  return db.transaction(async (transaction) => {
    const [entry] = await transaction
      .select({ id: attendance.id, classId: attendance.classId })
      .from(attendance)
      .where(and(eq(attendance.id, attendanceId), isNull(attendance.removedAt)))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("Active attendance was not found.");
    requireMutableRosterClass(
      await requireAssignedInstructor(transaction, actor, entry.classId),
    );
    await transaction
      .update(attendance)
      .set({
        removedAt: now,
        removedByUserId: actor.id,
        removalReason: reason.trim(),
      })
      .where(eq(attendance.id, entry.id));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "attendance.removed",
      entityType: "attendance",
      entityId: entry.id,
      details: { classId: entry.classId, reason: reason.trim() },
    });
  });
}

export async function adjustCreditedHours(
  db: Database,
  actor: RosterActor,
  attendanceId: string,
  creditedHours: number,
  reason?: string,
  now = new Date(),
) {
  return db.transaction(async (transaction) => {
    const [entry] = await transaction
      .select({ id: attendance.id, classId: attendance.classId })
      .from(attendance)
      .where(and(eq(attendance.id, attendanceId), isNull(attendance.removedAt)))
      .limit(1)
      .for("update");
    if (!entry) throw new Error("Active attendance was not found.");
    requireMutableRosterClass(
      await requireAssignedInstructor(transaction, actor, entry.classId),
    );
    const scheduledHours = await getScheduledClassHours(
      transaction,
      entry.classId,
    );
    validateCreditedHours(creditedHours, scheduledHours, reason);
    const changed = creditedHours !== scheduledHours;
    await transaction
      .update(attendance)
      .set({
        creditedHours: String(creditedHours),
        creditAdjustmentReason: changed ? reason?.trim() : null,
        creditAdjustedByUserId: changed ? actor.id : null,
        creditAdjustedAt: changed ? now : null,
      })
      .where(eq(attendance.id, entry.id));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "attendance.credit_adjusted",
      entityType: "attendance",
      entityId: entry.id,
      details: {
        classId: entry.classId,
        creditedHours,
        reason: changed ? reason?.trim() : undefined,
      },
    });
  });
}

export async function validateRosterCompletion(
  transaction: DatabaseTransaction,
  classId: string,
) {
  const scheduledHours = await getScheduledClassHours(transaction, classId);
  const requirements = await resolveClassRequirements(transaction, classId);
  const active = await transaction
    .select({ id: attendance.id, creditedHours: attendance.creditedHours })
    .from(attendance)
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)))
    .for("update");
  if (!active.length)
    throw new Error("At least one participant must sign in before finalizing.");
  for (const entry of active) {
    const credit =
      entry.creditedHours === null ? Number.NaN : Number(entry.creditedHours);
    if (!Number.isFinite(credit) || credit < 0 || credit > scheduledHours)
      throw new Error("Active attendance has invalid credited hours.");
    const contexts = await transaction
      .select({
        requirementSetId: attendanceReportingContexts.requirementSetId,
      })
      .from(attendanceReportingContexts)
      .where(eq(attendanceReportingContexts.attendanceId, entry.id));
    if (contexts.length !== requirements.sets.length)
      throw new Error(
        "Active attendance is missing required reporting context.",
      );
  }
}

export async function getRosterReadiness(
  db: Database,
  actor: RosterActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      classId,
      false,
    );
    if (classRecord.status !== CLASS_STATUSES.OPEN)
      throw new Error("Roster unavailable.");

    // A destination changed after sign-in leaves reporting context stale; bring
    // it into line so the review screen presents an accurate readiness state.
    await reconcileAttendanceReportingContexts(transaction, classId);

    const scheduledHours = await getScheduledClassHours(transaction, classId);
    const requirements = await resolveClassRequirements(transaction, classId);
    const active = await transaction
      .select({
        id: attendance.id,
        creditedHours: attendance.creditedHours,
        studentId: attendance.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        guestFirstName: classGuests.firstName,
        guestLastName: classGuests.lastName,
      })
      .from(attendance)
      .leftJoin(students, eq(students.id, attendance.studentId))
      .leftJoin(classGuests, eq(classGuests.id, attendance.guestId))
      .where(
        and(eq(attendance.classId, classId), isNull(attendance.removedAt)),
      );
    const issues: string[] = [];
    if (!active.length)
      issues.push("At least one participant must sign in before finalizing.");
    for (const entry of active) {
      const name = participantLabel(entry);
      const credit =
        entry.creditedHours === null ? Number.NaN : Number(entry.creditedHours);
      if (!Number.isFinite(credit) || credit < 0 || credit > scheduledHours)
        issues.push(readinessIssue(name, "credit"));
      const contexts = await transaction
        .select({
          requirementSetId: attendanceReportingContexts.requirementSetId,
        })
        .from(attendanceReportingContexts)
        .where(eq(attendanceReportingContexts.attendanceId, entry.id));
      if (contexts.length !== requirements.sets.length)
        issues.push(readinessIssue(name, "context"));
    }
    return { ready: issues.length === 0, issues, scheduledHours };
  });
}

export async function getClassRoster(
  db: Database,
  actor: RosterActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireAssignedInstructor(
      transaction,
      actor,
      classId,
      false,
    );
    // Finalized rosters are readable so the review screen can present the
    // locked roster; mutations stay blocked by requireMutableRosterClass.
    if (
      ![CLASS_STATUSES.OPEN, CLASS_STATUSES.FINALIZED].includes(
        classRecord.status as typeof CLASS_STATUSES.OPEN,
      )
    )
      throw new Error("Roster unavailable.");
    const rows = await transaction
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        guestId: attendance.guestId,
        signedInAt: attendance.signedInAt,
        creditedHours: attendance.creditedHours,
        isManual: attendance.isManual,
        removedAt: attendance.removedAt,
        removalReason: attendance.removalReason,
        firstName: students.firstName,
        lastName: students.lastName,
        guestFirstName: classGuests.firstName,
        guestLastName: classGuests.lastName,
        agencyName: agencies.name,
        signInMethod: attendanceAttestations.signInMethod,
        removedBy: users.displayName,
      })
      .from(attendance)
      .innerJoin(agencies, eq(agencies.id, attendance.agencyId))
      .leftJoin(students, eq(students.id, attendance.studentId))
      .leftJoin(classGuests, eq(classGuests.id, attendance.guestId))
      .leftJoin(
        attendanceAttestations,
        eq(attendanceAttestations.attendanceId, attendance.id),
      )
      .leftJoin(users, eq(users.id, attendance.removedByUserId))
      .where(eq(attendance.classId, classId))
      .orderBy(asc(attendance.signedInAt));
    const corrections = await listClassCredentialCorrections(
      transaction,
      classId,
    );
    const map = (row: (typeof rows)[number]) => ({
      ...row,
      participantType: row.studentId ? "regular" : "guest",
      name: row.studentId
        ? `${row.firstName} ${row.lastName}`
        : `${row.guestFirstName} ${row.guestLastName}`,
      corrections: row.studentId ? (corrections.get(row.id) ?? []) : [],
    });
    return {
      classRecord,
      scheduledHours: await getScheduledClassHours(transaction, classId),
      active: rows.filter((row) => !row.removedAt).map(map),
      removed: rows.filter((row) => row.removedAt).map(map),
    };
  });
}

/**
 * The payload the class page polls while a class is open. Built on
 * `getClassRoster`, so the same assignment/elevation rule applies, and the
 * returned `status` lets the page stop refreshing once the class leaves `open`.
 */
export async function getClassRosterRefresh(
  db: Database,
  actor: RosterActor,
  classId: string,
): Promise<RosterRefreshPayload> {
  const roster = await getClassRoster(db, actor, classId);
  // The live refresh endpoint serves only classes still in progress. A
  // finalized roster is readable through the review path, but it is terminal
  // and is not polled here.
  // Return finalized status once so the live client can refresh to the record.
  const sessions = await db
    .select({ endsAt: classComponents.endsAt })
    .from(classComponents)
    .where(eq(classComponents.classId, classId));
  const refreshDeadline = computeRosterRefreshDeadline(
    sessions.map((session) => session.endsAt),
  );
  return {
    status: roster.classRecord.status,
    scheduledHours: roster.scheduledHours,
    refreshDeadline: refreshDeadline?.toISOString() ?? null,
    active: roster.active.map((entry) => ({
      id: entry.id,
      name: entry.name,
      agencyName: entry.agencyName,
      signedInAt: entry.signedInAt.toISOString(),
      signedInAtLabel: formatDepartmentDateTime(entry.signedInAt),
      creditedHours: entry.creditedHours,
      corrections: entry.corrections,
    })),
  };
}

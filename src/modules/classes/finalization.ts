import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { validateRosterCompletion } from "@/modules/instructor-roster/services";
import { encryptCredential } from "@/modules/reference/crypto";
import { ROLE_CODES } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { writeAuditLog } from "@/server/db/audit";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  attendanceAttestations,
  attendanceCredentialSnapshots,
  attendanceRequiredFieldSnapshots,
  classGuests,
  classInstructors,
  classReportingSystems,
  courses,
  finalizationReopens,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingSystems,
  roles,
  students,
  trainingClasses,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";

import {
  validateFinalizationTransition,
  validateReopenReason,
  validateReportingStatusTransition,
} from "./policy";

export interface FinalizationActor {
  id: string;
  username: string;
}

async function hasElevatedRole(
  transaction: DatabaseTransaction,
  userId: string,
) {
  const rows = await transaction
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
  return rows.length > 0;
}

async function requireFinalizationAccess(
  transaction: DatabaseTransaction,
  actor: FinalizationActor,
  classId: string,
) {
  const [classRecord] = await transaction
    .select()
    .from(trainingClasses)
    .where(eq(trainingClasses.id, classId))
    .limit(1)
    .for("update");
  if (!classRecord) throw new Error("Class not found.");
  if (await hasElevatedRole(transaction, actor.id)) return classRecord;
  const assigned = await transaction
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actor.id),
      ),
    )
    .limit(1);
  if (!assigned.length) throw new Error("Finalization access denied.");
  return classRecord;
}

async function requireReportingAccess(
  transaction: DatabaseTransaction,
  actor: FinalizationActor,
) {
  if (!(await hasElevatedRole(transaction, actor.id)))
    throw new Error(
      "Reporting updates require Training Major or Administrator access.",
    );
}

async function buildSnapshot(
  transaction: DatabaseTransaction,
  classId: string,
) {
  const [classRow] = await transaction
    .select({
      classId: trainingClasses.id,
      status: trainingClasses.status,
      deliveryMethod: trainingClasses.deliveryMethod,
      completedAt: trainingClasses.completedAt,
      courseName: courses.name,
      siteName: trainingSites.name,
    })
    .from(trainingClasses)
    .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const [
    instructors,
    roster,
    destinations,
    requirements,
    fieldSnapshots,
    credentialSnapshots,
  ] = await Promise.all([
    transaction
      .select({ name: users.displayName, isLead: classInstructors.isLead })
      .from(classInstructors)
      .innerJoin(users, eq(users.id, classInstructors.userId))
      .where(eq(classInstructors.classId, classId))
      .orderBy(asc(users.displayName)),
    transaction
      .select({
        attendanceId: attendance.id,
        studentId: attendance.studentId,
        guestId: attendance.guestId,
        agencyName: agencies.name,
        signedInAt: attendance.signedInAt,
        creditedHours: attendance.creditedHours,
        attestedAt: attendanceAttestations.confirmedAt,
        signInMethod: attendanceAttestations.signInMethod,
        firstName: students.firstName,
        lastName: students.lastName,
        guestFirstName: classGuests.firstName,
        guestLastName: classGuests.lastName,
      })
      .from(attendance)
      .innerJoin(agencies, eq(agencies.id, attendance.agencyId))
      .leftJoin(
        attendanceAttestations,
        eq(attendanceAttestations.attendanceId, attendance.id),
      )
      .leftJoin(students, eq(students.id, attendance.studentId))
      .leftJoin(classGuests, eq(classGuests.id, attendance.guestId))
      .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)))
      .orderBy(asc(attendance.signedInAt)),
    transaction
      .select({
        reportingSystemId: reportingSystems.id,
        code: reportingSystems.code,
        name: reportingSystems.name,
      })
      .from(classReportingSystems)
      .innerJoin(
        reportingSystems,
        eq(reportingSystems.id, classReportingSystems.reportingSystemId),
      )
      .where(eq(classReportingSystems.classId, classId))
      .orderBy(asc(reportingSystems.code)),
    resolveClassRequirements(transaction, classId),
    transaction
      .select({
        attendanceId: attendanceRequiredFieldSnapshots.attendanceId,
        requirementSetId: attendanceRequiredFieldSnapshots.requirementSetId,
        studentField: attendanceRequiredFieldSnapshots.studentField,
        encryptedValue: attendanceRequiredFieldSnapshots.encryptedValue,
      })
      .from(attendanceRequiredFieldSnapshots)
      .innerJoin(
        attendance,
        eq(attendance.id, attendanceRequiredFieldSnapshots.attendanceId),
      )
      .where(
        and(eq(attendance.classId, classId), isNull(attendance.removedAt)),
      ),
    transaction
      .select({
        attendanceId: attendanceCredentialSnapshots.attendanceId,
        requirementSetId: attendanceCredentialSnapshots.requirementSetId,
        credentialTypeId: attendanceCredentialSnapshots.credentialTypeId,
        encryptedValue: attendanceCredentialSnapshots.encryptedValue,
        maskedSuffix: attendanceCredentialSnapshots.maskedSuffix,
      })
      .from(attendanceCredentialSnapshots)
      .innerJoin(
        attendance,
        eq(attendance.id, attendanceCredentialSnapshots.attendanceId),
      )
      .where(
        and(eq(attendance.classId, classId), isNull(attendance.removedAt)),
      ),
  ]);
  if (!classRow) throw new Error("Class not found.");
  return {
    class: classRow,
    instructors,
    attendance: roster,
    destinations,
    requirements,
    fieldSnapshots,
    credentialSnapshots,
  };
}

export async function finalizeClass(
  db: Database,
  actor: FinalizationActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    const classRecord = await requireFinalizationAccess(
      transaction,
      actor,
      classId,
    );
    validateFinalizationTransition(classRecord.status);
    await validateRosterCompletion(transaction, classId);
    const [nextRevision] = await transaction
      .select({
        next: sql<number>`coalesce(max(${finalizationRevisions.revisionNumber}), 0) + 1`,
      })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.classId, classId));
    const next = nextRevision?.next ?? 1;
    const snapshot = await buildSnapshot(transaction, classId);
    const [revision] = await transaction
      .insert(finalizationRevisions)
      .values({
        classId,
        revisionNumber: next,
        finalizedByUserId: actor.id,
        encryptedSnapshot: encryptCredential(JSON.stringify(snapshot)),
        summary: {
          courseName: snapshot.class.courseName,
          completedAt: snapshot.class.completedAt,
          attendanceCount: snapshot.attendance.length,
          instructorCount: snapshot.instructors.length,
        },
      })
      .returning();
    if (!revision) throw new Error("Finalization revision was not created.");
    if (snapshot.destinations.length)
      await transaction.insert(finalizationReportingStatuses).values(
        snapshot.destinations.map((destination) => ({
          revisionId: revision.id,
          reportingSystemId: destination.reportingSystemId,
        })),
      );
    await transaction
      .update(trainingClasses)
      .set({ status: "finalized", updatedAt: new Date() })
      .where(
        and(
          eq(trainingClasses.id, classId),
          eq(trainingClasses.status, "completed"),
        ),
      );
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.finalized",
      entityType: "class",
      entityId: classId,
      details: { revisionId: revision.id, revisionNumber: next },
    });
    return revision;
  });
}

export async function reopenFinalizedClass(
  db: Database,
  actor: FinalizationActor,
  classId: string,
  reason: string,
) {
  validateReopenReason(reason);
  return db.transaction(async (transaction) => {
    const classRecord = await requireFinalizationAccess(
      transaction,
      actor,
      classId,
    );
    if (classRecord.status !== "finalized")
      throw new Error("Only finalized classes can be reopened.");
    const [revision] = await transaction
      .select()
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.classId, classId))
      .orderBy(desc(finalizationRevisions.revisionNumber))
      .limit(1)
      .for("update");
    if (!revision) throw new Error("Finalization history is unavailable.");
    await transaction.insert(finalizationReopens).values({
      revisionId: revision.id,
      reopenedByUserId: actor.id,
      reason: reason.trim(),
    });
    // Reopening returns the roster to its existing editable state; completion is
    // revalidated before a later revision can be finalized.
    await transaction
      .update(trainingClasses)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(trainingClasses.id, classId));
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "class.reopened",
      entityType: "class",
      entityId: classId,
      details: { revisionId: revision.id, reason: reason.trim() },
    });
  });
}

export async function updateReportingDestination(
  db: Database,
  actor: FinalizationActor,
  input: {
    revisionId: string;
    reportingSystemId: string;
    status: string;
    referenceNumber?: string;
    notes?: string;
  },
) {
  return db.transaction(async (transaction) => {
    await requireReportingAccess(transaction, actor);
    const [revision] = await transaction
      .select({ classId: finalizationRevisions.classId })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, input.revisionId))
      .limit(1)
      .for("update");
    if (!revision) throw new Error("Finalization revision not found.");
    await transaction
      .select({ id: trainingClasses.id })
      .from(trainingClasses)
      .where(eq(trainingClasses.id, revision.classId))
      .limit(1)
      .for("update");
    const [current] = await transaction
      .select()
      .from(finalizationReportingStatuses)
      .where(
        and(
          eq(finalizationReportingStatuses.revisionId, input.revisionId),
          eq(
            finalizationReportingStatuses.reportingSystemId,
            input.reportingSystemId,
          ),
        ),
      )
      .limit(1)
      .for("update");
    if (!current) throw new Error("Reporting destination not found.");
    validateReportingStatusTransition(
      current.status,
      input.status,
      input.notes,
    );
    const now = new Date();
    const [updated] = await transaction
      .update(finalizationReportingStatuses)
      .set({
        status: input.status,
        reportedByUserId: actor.id,
        reportedAt: now,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        updatedAt: now,
      })
      .where(eq(finalizationReportingStatuses.id, current.id))
      .returning();
    await writeAuditLog(transaction, {
      actorUserId: actor.id,
      actorType: "user",
      action: "reporting.destination.updated",
      entityType: "finalization_revision",
      entityId: input.revisionId,
      details: {
        reportingSystemId: input.reportingSystemId,
        from: current.status,
        to: input.status,
      },
    });
    return updated;
  });
}

export async function getFinalizationHistory(
  db: Database,
  actor: FinalizationActor,
  classId: string,
) {
  return db.transaction(async (transaction) => {
    await requireFinalizationAccess(transaction, actor, classId);
    const revisions = await transaction
      .select({
        id: finalizationRevisions.id,
        revisionNumber: finalizationRevisions.revisionNumber,
        finalizedAt: finalizationRevisions.finalizedAt,
        finalizedBy: users.displayName,
        summary: finalizationRevisions.summary,
        reopenReason: finalizationReopens.reason,
        reopenedAt: finalizationReopens.reopenedAt,
      })
      .from(finalizationRevisions)
      .innerJoin(users, eq(users.id, finalizationRevisions.finalizedByUserId))
      .leftJoin(
        finalizationReopens,
        eq(finalizationReopens.revisionId, finalizationRevisions.id),
      )
      .where(eq(finalizationRevisions.classId, classId))
      .orderBy(desc(finalizationRevisions.revisionNumber));
    const statuses = await transaction
      .select({
        revisionId: finalizationReportingStatuses.revisionId,
        reportingSystemId: reportingSystems.id,
        systemName: reportingSystems.name,
        status: finalizationReportingStatuses.status,
        referenceNumber: finalizationReportingStatuses.referenceNumber,
        notes: finalizationReportingStatuses.notes,
        updatedAt: finalizationReportingStatuses.updatedAt,
      })
      .from(finalizationReportingStatuses)
      .innerJoin(
        reportingSystems,
        eq(
          reportingSystems.id,
          finalizationReportingStatuses.reportingSystemId,
        ),
      )
      .where(
        inArray(
          finalizationReportingStatuses.revisionId,
          revisions.map((revision) => revision.id),
        ),
      );
    return revisions.map((revision) => ({
      ...revision,
      destinations: statuses.filter(
        (status) => status.revisionId === revision.id,
      ),
    }));
  });
}

export async function listReportingQueue(
  db: Database,
  actor: FinalizationActor,
  status: "pending" | "needs_correction",
) {
  return db.transaction(async (transaction) => {
    await requireReportingAccess(transaction, actor);
    return transaction
      .select({
        revisionId: finalizationRevisions.id,
        revisionNumber: finalizationRevisions.revisionNumber,
        classId: trainingClasses.id,
        courseName: courses.name,
        systemId: reportingSystems.id,
        systemName: reportingSystems.name,
        status: finalizationReportingStatuses.status,
        notes: finalizationReportingStatuses.notes,
        updatedAt: finalizationReportingStatuses.updatedAt,
      })
      .from(finalizationReportingStatuses)
      .innerJoin(
        finalizationRevisions,
        eq(finalizationRevisions.id, finalizationReportingStatuses.revisionId),
      )
      .innerJoin(
        trainingClasses,
        eq(trainingClasses.id, finalizationRevisions.classId),
      )
      .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
      .innerJoin(
        reportingSystems,
        eq(
          reportingSystems.id,
          finalizationReportingStatuses.reportingSystemId,
        ),
      )
      .where(eq(finalizationReportingStatuses.status, status))
      .orderBy(asc(finalizationReportingStatuses.updatedAt));
  });
}

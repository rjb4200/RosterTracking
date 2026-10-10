import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";
import { buildClassSignInRecord } from "@/modules/class-sign-in-record/service";
import {
  queueCertificateDeliveries,
  revisionReportsToKbems,
} from "@/modules/completion-certificates/service";
import {
  isFireClass,
  queueTrainingNoticeDeliveries,
} from "@/modules/individual-training-notices/service";
import { validateRosterCompletion } from "@/modules/instructor-roster/services";
import { encryptCredential } from "@/modules/reference/crypto";
import {
  countFireEligible,
  isFireEligibleFromSnapshots,
} from "@/modules/reference/fire-eligibility";
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
  classComponents,
  classGuests,
  classInstructors,
  classReportingSystems,
  credentialTypes,
  curricula,
  finalizationReopens,
  finalizationReportingStatuses,
  finalizationRevisions,
  reportingSystems,
  roles,
  students,
  trainingClasses,
  trainingCodes,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";
import {
  validateFinalizationTransition,
  validateReopenReason,
  validateReportingStatusTransition,
} from "./policy";
import { confirmMtuUsageForFinalization } from "./services";

export interface FinalizationActor {
  id: string;
  username: string;
}

// The lead instructor's certification statement, versioned so a later wording
// change is a new version rather than a silent edit of retained revisions.
export const ROSTER_ATTESTATION_VERSION = "roster-attestation-001";
export const ROSTER_ATTESTATION_TEXT =
  "I certify that this roster is complete and accurate to the best of my knowledge.";

async function hasRole(
  transaction: DatabaseTransaction,
  userId: string,
  codes: string[],
) {
  const rows = await transaction
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(roles.isActive, true),
        inArray(roles.code, codes),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function hasElevatedRole(
  transaction: DatabaseTransaction,
  userId: string,
) {
  return hasRole(transaction, userId, [
    ROLE_CODES.ADMINISTRATOR,
    ROLE_CODES.TRAINING_MAJOR,
  ]);
}

async function requireLeadInstructorAccess(
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
  const [lead] = await transaction
    .select({ classId: classInstructors.classId })
    .from(classInstructors)
    .where(
      and(
        eq(classInstructors.classId, classId),
        eq(classInstructors.userId, actor.id),
        eq(classInstructors.isLead, true),
      ),
    )
    .limit(1);
  if (!lead) {
    throw new Error(
      "Only the class's lead instructor can finalize the roster.",
    );
  }
  return classRecord;
}

async function requireReopenAccess(
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
  if (!(await hasRole(transaction, actor.id, [ROLE_CODES.ADMINISTRATOR]))) {
    throw new Error("Only an Administrator can reopen a finalized class.");
  }
  return classRecord;
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
  if (classRecord.createdByUserId === actor.id) return classRecord;
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
  finalizedAt: Date,
) {
  const [classRow] = await transaction
    .select({
      classId: trainingClasses.id,
      status: trainingClasses.status,
      deliveryMethod: trainingClasses.deliveryMethod,
      objectives: trainingClasses.objectives,
      courseType: trainingClasses.courseType,
      courseNumber: trainingClasses.courseNumber,
      courseName: sql<string>`coalesce(${trainingClasses.name}, '')`,
      siteName: trainingSites.name,
      hostAgencyId: trainingClasses.hostAgencyId,
      hostAgencyName: sql<
        string | null
      >`(select name from ${agencies} where ${agencies.id} = ${trainingClasses.hostAgencyId})`,
    })
    .from(trainingClasses)
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  const instructors = await transaction
    .select({
      name: users.displayName,
      isLead: classInstructors.isLead,
      ffn: users.ffn,
      level: users.instructorLevel,
    })
    .from(classInstructors)
    .innerJoin(users, eq(users.id, classInstructors.userId))
    .where(eq(classInstructors.classId, classId))
    .orderBy(asc(users.displayName));
  const roster = await transaction
    .select({
      attendanceId: attendance.id,
      studentId: attendance.studentId,
      guestId: attendance.guestId,
      agencyId: attendance.agencyId,
      agencyName: agencies.name,
      signedInAt: attendance.signedInAt,
      creditedHours: attendance.creditedHours,
      attestedAt: attendanceAttestations.confirmedAt,
      signInMethod: attendanceAttestations.signInMethod,
      firstName: students.firstName,
      lastName: students.lastName,
      guestFirstName: classGuests.firstName,
      guestLastName: classGuests.lastName,
      studentEmail: students.email,
      guestEmail: classGuests.email,
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
    .orderBy(asc(attendance.signedInAt));
  const destinations = await transaction
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
    .orderBy(asc(reportingSystems.code));
  const requirements = await resolveClassRequirements(transaction, classId);
  const fieldSnapshots = await transaction
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
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)));
  const credentialSnapshots = await transaction
    .select({
      attendanceId: attendanceCredentialSnapshots.attendanceId,
      requirementSetId: attendanceCredentialSnapshots.requirementSetId,
      credentialTypeId: attendanceCredentialSnapshots.credentialTypeId,
      credentialTypeCode: credentialTypes.code,
      encryptedValue: attendanceCredentialSnapshots.encryptedValue,
      maskedSuffix: attendanceCredentialSnapshots.maskedSuffix,
    })
    .from(attendanceCredentialSnapshots)
    .innerJoin(
      credentialTypes,
      eq(credentialTypes.id, attendanceCredentialSnapshots.credentialTypeId),
    )
    .innerJoin(
      attendance,
      eq(attendance.id, attendanceCredentialSnapshots.attendanceId),
    )
    .where(and(eq(attendance.classId, classId), isNull(attendance.removedAt)));
  if (!classRow) throw new Error("Class not found.");
  return {
    // Keep the historical snapshot key used by official PDF date fields;
    // completion now occurs at the same instant as finalization.
    class: {
      ...classRow,
      status: "finalized",
      completedAt: finalizedAt.toISOString(),
    },
    instructors,
    components: (
      await transaction
        .select({
          title: classComponents.title,
          category: trainingCodes.code,
          className: classComponents.className,
          curriculumPublisher: curricula.publisher,
          curriculumProgramTitle: curricula.programTitle,
          curriculumVersion: curricula.version,
          curriculumName: classComponents.curriculumName,
          curriculumChapter: classComponents.curriculumChapter,
          lessonPlan: classComponents.lessonPlan,
          method: classComponents.method,
          startsAt: classComponents.startsAt,
          endsAt: classComponents.endsAt,
          creditedHours: classComponents.creditedHours,
        })
        .from(classComponents)
        .leftJoin(
          trainingCodes,
          eq(trainingCodes.id, classComponents.trainingCodeId),
        )
        .leftJoin(curricula, eq(curricula.id, classComponents.curriculumId))
        .where(eq(classComponents.classId, classId))
        .orderBy(asc(classComponents.position))
    ).map((component) => ({
      ...component,
      startsAt: component.startsAt.toISOString(),
      endsAt: component.endsAt.toISOString(),
    })),
    attendance: roster.map((entry) => ({
      attendanceId: entry.attendanceId,
      agencyName: entry.agencyName,
      agencyId: entry.agencyId,
      creditedHours: entry.creditedHours,
      firstName: entry.firstName,
      lastName: entry.lastName,
      guestFirstName: entry.guestFirstName,
      guestLastName: entry.guestLastName,
      email: entry.studentEmail ?? entry.guestEmail ?? null,
      fireEligible: isFireEligibleFromSnapshots(
        { attendance: [], fieldSnapshots, credentialSnapshots },
        entry.attendanceId,
      ),
    })),
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
  attestation: { certified: boolean; typedName: string },
  mtu?: {
    confirmed: boolean;
    equipmentIds: string[];
    supplies: { itemId: string; quantity?: string | number }[];
  },
) {
  if (!attestation.certified) {
    throw new Error("Certify the roster before finalizing.");
  }
  const typedName = attestation.typedName.trim();
  if (!typedName) throw new Error("Type your name to sign the roster.");
  return db.transaction(async (transaction) => {
    const classRecord = await requireLeadInstructorAccess(
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
    const finalizedAt = new Date();
    const snapshot = await buildSnapshot(transaction, classId, finalizedAt);
    // An MTU class must confirm usage before signing. This writes only the
    // operational usage tables; it never touches the participant count or the
    // revision number captured below.
    if (
      snapshot.destinations.some((destination) => destination.code === "mtu")
    ) {
      if (!mtu?.confirmed) {
        throw new Error("Confirm the MTU usage before finalizing.");
      }
      await confirmMtuUsageForFinalization(
        transaction,
        classId,
        mtu.equipmentIds ?? [],
        mtu.supplies ?? [],
      );
    }
    const revisionRows = await transaction
      .select({
        attendanceId: attendance.id,
        studentId: attendance.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        guestFirstName: classGuests.firstName,
        guestLastName: classGuests.lastName,
        agencyName: agencies.name,
        creditedHours: attendance.creditedHours,
        signedInAt: attendance.signedInAt,
        removedAt: attendance.removedAt,
        removalReason: attendance.removalReason,
        removedBy: users.displayName,
        signInMethod: attendanceAttestations.signInMethod,
        renderedText: attendanceAttestations.renderedText,
        textVersion: attendanceAttestations.textVersion,
        confirmedAt: attendanceAttestations.confirmedAt,
        originatingIp: attendanceAttestations.originatingIp,
        rememberedDeviceId: attendanceAttestations.rememberedDeviceId,
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
    const signInRecord = buildClassSignInRecord(revisionRows, {
      classId,
      courseName: snapshot.class.courseName,
      siteName: snapshot.class.siteName,
      hostAgencyName: snapshot.attendance[0]?.agencyName ?? "",
      deliveryMethod: snapshot.class.deliveryMethod,
      generatedAt: new Date(),
    });
    const [revision] = await transaction
      .insert(finalizationRevisions)
      .values({
        classId,
        revisionNumber: next,
        finalizedByUserId: actor.id,
        finalizedAt,
        signedByUserId: actor.id,
        signedByName: typedName,
        signedAt: finalizedAt,
        attestationVersion: ROSTER_ATTESTATION_VERSION,
        encryptedSnapshot: encryptCredential(
          JSON.stringify({
            ...snapshot,
            signInRecord,
            signature: {
              name: typedName,
              signedAt: finalizedAt.toISOString(),
              attestationVersion: ROSTER_ATTESTATION_VERSION,
            },
          }),
        ),
        summary: {
          courseName: snapshot.class.courseName,
          completedAt: snapshot.class.completedAt,
          attendanceCount: snapshot.attendance.length,
          instructorCount: snapshot.instructors.length,
          // Frozen so the Fire reporting queue can count the eligible subset
          // without re-evaluating mutable credentials.
          fireEligibleCount: countFireEligible(snapshot),
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
    // EMS classes deliver a personal certificate to each participant. The rows
    // are written in this transaction and dispatched after it commits, so a
    // mail failure can never block or roll back finalization.
    if (revisionReportsToKbems(snapshot)) {
      await queueCertificateDeliveries(transaction, revision.id, {
        ...snapshot,
        signature: {
          name: typedName,
          signedAt: finalizedAt.toISOString(),
          attestationVersion: ROSTER_ATTESTATION_VERSION,
        },
      });
    }
    // Fire classes deliver an individual training notice to each participant
    // whose agency differs from the host agency.
    if (isFireClass(snapshot)) {
      await queueTrainingNoticeDeliveries(transaction, revision.id, {
        ...snapshot,
        signature: {
          name: typedName,
          signedAt: finalizedAt.toISOString(),
          attestationVersion: ROSTER_ATTESTATION_VERSION,
        },
      });
    }
    await transaction
      .update(trainingClasses)
      .set({ status: "finalized", updatedAt: finalizedAt })
      .where(
        and(
          eq(trainingClasses.id, classId),
          eq(trainingClasses.status, "open"),
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
    const classRecord = await requireReopenAccess(transaction, actor, classId);
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
        signedByName: finalizationRevisions.signedByName,
        signedAt: finalizationRevisions.signedAt,
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
        systemCode: reportingSystems.code,
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
  filters: {
    reportingSystemId?: string;
    status?: string;
    from?: Date;
    to?: Date;
  } = {},
) {
  return db.transaction(async (transaction) => {
    await requireReportingAccess(transaction, actor);
    const classDate = sql<Date | null>`(
      select min(${classComponents.startsAt})
      from ${classComponents}
      where ${classComponents.classId} = ${trainingClasses.id}
    )`;
    const leadInstructor = sql<string | null>`(
      select ${users.displayName}
      from ${classInstructors}
      inner join ${users} on ${users.id} = ${classInstructors.userId}
      where ${classInstructors.classId} = ${trainingClasses.id}
        and ${classInstructors.isLead}
      limit 1
    )`;
    const attendanceCount = sql<number>`(
      select count(*)::int
      from ${attendance}
      where ${attendance.classId} = ${trainingClasses.id}
        and ${attendance.removedAt} is null
    )`;
    // Only active destinations are offered as work; a retired destination
    // (for example FEMA) keeps its history but no longer appears as queue work.
    const baseFilters: SQL[] = [eq(reportingSystems.isActive, true)];
    if (filters.reportingSystemId) {
      baseFilters.push(
        eq(
          finalizationReportingStatuses.reportingSystemId,
          filters.reportingSystemId,
        ),
      );
    }
    if (filters.from) baseFilters.push(gte(classDate, filters.from));
    if (filters.to) baseFilters.push(lte(classDate, filters.to));
    const rowFilters = [...baseFilters];
    if (filters.status) {
      rowFilters.push(eq(finalizationReportingStatuses.status, filters.status));
    } else {
      rowFilters.push(
        inArray(finalizationReportingStatuses.status, [
          "pending",
          "needs_correction",
        ]),
      );
    }

    const rows = await transaction
      .select({
        revisionId: finalizationRevisions.id,
        revisionNumber: finalizationRevisions.revisionNumber,
        classId: trainingClasses.id,
        classDate,
        courseName: trainingClasses.name,
        leadInstructor,
        attendanceCount,
        systemId: reportingSystems.id,
        systemCode: reportingSystems.code,
        systemName: reportingSystems.name,
        status: finalizationReportingStatuses.status,
        referenceNumber: finalizationReportingStatuses.referenceNumber,
        notes: finalizationReportingStatuses.notes,
        updatedAt: finalizationReportingStatuses.updatedAt,
        summary: finalizationRevisions.summary,
        // The immediately preceding revision of the same class, and its status
        // for the same destination. Null for a first-time finalization.
        supersededRevisionNumber: sql<number | null>`(
          select max(previous_revision.revision_number)
          from finalization_revisions previous_revision
          where previous_revision.class_id = ${trainingClasses.id}
            and previous_revision.revision_number < ${finalizationRevisions.revisionNumber}
        )`,
        supersededStatus: sql<string | null>`(
          select previous_status.status
          from finalization_reporting_statuses previous_status
          inner join finalization_revisions previous_revision
            on previous_revision.id = previous_status.revision_id
          where previous_revision.class_id = ${trainingClasses.id}
            and previous_revision.revision_number < ${finalizationRevisions.revisionNumber}
            and previous_status.reporting_system_id = ${finalizationReportingStatuses.reportingSystemId}
          order by previous_revision.revision_number desc
          limit 1
        )`,
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
      .innerJoin(
        reportingSystems,
        eq(
          reportingSystems.id,
          finalizationReportingStatuses.reportingSystemId,
        ),
      )
      .where(and(...rowFilters))
      .orderBy(asc(finalizationReportingStatuses.updatedAt));
    const summaries = await transaction
      .select({
        systemId: reportingSystems.id,
        systemCode: reportingSystems.code,
        systemName: reportingSystems.name,
        status: finalizationReportingStatuses.status,
        count: sql<number>`count(*)::int`,
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
      .innerJoin(
        reportingSystems,
        eq(
          reportingSystems.id,
          finalizationReportingStatuses.reportingSystemId,
        ),
      )
      .where(and(...baseFilters))
      .groupBy(
        reportingSystems.id,
        reportingSystems.code,
        reportingSystems.name,
        finalizationReportingStatuses.status,
      )
      .orderBy(
        asc(reportingSystems.name),
        asc(finalizationReportingStatuses.status),
      );
    // The Fire destination covers only valid-FFN attendees, so its queue count
    // uses the frozen eligible subset rather than the full roster.
    const countedRows = rows.map((row) => {
      const frozen = (row.summary as { fireEligibleCount?: unknown } | null)
        ?.fireEligibleCount;
      return {
        ...row,
        attendanceCount:
          row.systemCode === "fire" && typeof frozen === "number"
            ? frozen
            : row.attendanceCount,
        summary: undefined,
      };
    });
    return { rows: countedRows, summaries };
  });
}

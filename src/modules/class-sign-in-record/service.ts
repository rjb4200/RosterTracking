import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import { hasElevatedRosterAccess } from "@/modules/instructor-roster/services";
import { decryptCredential } from "@/modules/reference/crypto";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  attendanceAttestations,
  classGuests,
  classInstructors,
  courses,
  finalizationRevisions,
  roles,
  students,
  trainingClasses,
  trainingSites,
  userRoles,
  users,
} from "@/server/db/schema";

import type {
  ClassSignInRecord,
  ClassSignInRecordEntry,
  ClassSignInRecordRemovedEntry,
} from "./pdf";

export interface SignInRecordActor {
  id: string;
  username: string;
}

async function assertClassRosterAccess(
  transaction: DatabaseTransaction,
  actor: SignInRecordActor,
  classId: string,
) {
  const elevated = await transaction
    .select({ id: roles.id, code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, actor.id), eq(roles.isActive, true)));
  if (hasElevatedRosterAccess(elevated.map((row) => row.code))) return;
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
  if (!assigned.length) throw new Error("Sign-in record access denied.");
}

export function buildClassSignInRecord(
  rows: Array<{
    attendanceId: string;
    studentId: string | null;
    firstName: string | null;
    lastName: string | null;
    guestFirstName: string | null;
    guestLastName: string | null;
    agencyName: string;
    creditedHours: string;
    signedInAt: Date;
    removedAt: Date | null;
    removalReason: string | null;
    removedBy: string | null;
    signInMethod: string | null;
    renderedText: string | null;
    textVersion: number | null;
    confirmedAt: Date | null;
    originatingIp: string | null;
    rememberedDeviceId: string | null;
  }>,
  classInfo: {
    classId: string;
    courseName: string;
    siteName: string | null;
    hostAgencyName: string;
    deliveryMethod: string;
    generatedAt: Date;
  },
): ClassSignInRecord {
  const map = (
    row: (typeof rows)[number],
  ): ClassSignInRecordEntry | ClassSignInRecordRemovedEntry => {
    const participantName = row.studentId
      ? `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim()
      : `${row.guestFirstName ?? ""} ${row.guestLastName ?? ""}`.trim();
    const attestation =
      row.renderedText && row.textVersion && row.confirmedAt
        ? {
            renderedText: row.renderedText,
            textVersion: row.textVersion,
            confirmedAt: row.confirmedAt,
            originatingIp: row.originatingIp ?? "unknown",
            rememberedDeviceId: row.rememberedDeviceId,
          }
        : null;
    const base: ClassSignInRecordEntry = {
      attendanceId: row.attendanceId,
      participantName,
      participantType: row.studentId ? "regular" : "guest",
      agencyName: row.agencyName,
      signInMethod: row.signInMethod ?? "unknown",
      creditedHours: row.creditedHours,
      signedInAt: row.signedInAt,
      attestation,
    };
    if (row.removedAt) {
      return {
        ...base,
        removedAt: row.removedAt,
        removedBy: row.removedBy ?? "staff",
        removalReason: row.removalReason ?? "",
      };
    }
    return base;
  };
  const mapped = rows.map(map);
  return {
    ...classInfo,
    active: mapped.filter(
      (entry): entry is ClassSignInRecordEntry => !("removedAt" in entry),
    ),
    removed: mapped.filter(
      (entry): entry is ClassSignInRecordRemovedEntry => "removedAt" in entry,
    ),
  };
}

async function readRows(transaction: DatabaseTransaction, classId: string) {
  return transaction
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
}

export async function getClassSignInRecord(
  db: Database,
  actor: SignInRecordActor,
  classId: string,
): Promise<ClassSignInRecord> {
  return db.transaction(async (transaction) => {
    await assertClassRosterAccess(transaction, actor, classId);
    const [classRow] = await transaction
      .select({
        classId: trainingClasses.id,
        courseName: courses.name,
        siteName: trainingSites.name,
        deliveryMethod: trainingClasses.deliveryMethod,
        hostAgencyName: agencies.name,
      })
      .from(trainingClasses)
      .innerJoin(courses, eq(courses.id, trainingClasses.courseId))
      .leftJoin(
        trainingSites,
        eq(trainingSites.id, trainingClasses.trainingSiteId),
      )
      .innerJoin(agencies, eq(agencies.id, trainingClasses.hostAgencyId))
      .where(eq(trainingClasses.id, classId))
      .limit(1);
    if (!classRow) throw new Error("Sign-in record unavailable.");
    const rows = await readRows(transaction, classId);
    return buildClassSignInRecord(rows, {
      ...classRow,
      generatedAt: new Date(),
    });
  });
}

export function buildClassSignInRecordFromSnapshot(
  snapshot: unknown,
): ClassSignInRecord | null {
  if (
    typeof snapshot !== "object" ||
    snapshot === null ||
    !("signInRecord" in snapshot)
  ) {
    return null;
  }
  const record = (snapshot as { signInRecord?: unknown }).signInRecord;
  if (typeof record !== "object" || record === null) return null;
  return record as ClassSignInRecord;
}

export async function getFinalizedSignInRecord(
  db: Database,
  actor: SignInRecordActor,
  revisionId: string,
): Promise<ClassSignInRecord> {
  return db.transaction(async (transaction) => {
    const [revision] = await transaction
      .select({
        classId: finalizationRevisions.classId,
        encryptedSnapshot: finalizationRevisions.encryptedSnapshot,
      })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.id, revisionId))
      .limit(1);
    if (!revision) throw new Error("Sign-in record unavailable.");
    await assertClassRosterAccess(transaction, actor, revision.classId);
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(decryptCredential(revision.encryptedSnapshot));
    } catch {
      throw new Error("Sign-in record unavailable.");
    }
    const record = buildClassSignInRecordFromSnapshot(snapshot);
    if (!record) throw new Error("Sign-in record unavailable.");
    return record;
  });
}

export async function canAccessOpenClassRecord(
  db: Database,
  actor: SignInRecordActor,
  classId: string,
): Promise<boolean> {
  try {
    await getClassSignInRecord(db, actor, classId);
    return true;
  } catch {
    return false;
  }
}

export function recordStatusFor(classStatus: string): boolean {
  return [
    CLASS_STATUSES.OPEN,
    CLASS_STATUSES.COMPLETED,
    CLASS_STATUSES.FINALIZED,
  ].includes(classStatus as typeof CLASS_STATUSES.OPEN);
}

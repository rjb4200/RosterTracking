import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { CLASS_STATUSES } from "@/modules/classes/constants";
import {
  deliveryMethodsFromComponentMethods,
  formatDeliveryMethods,
} from "@/modules/classes/delivery-methods";
import { assertClassRosterAccess } from "@/modules/instructor-roster/services";
import { decryptCredential } from "@/modules/reference/crypto";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  agencies,
  attendance,
  attendanceAttestations,
  attendanceCheckIns,
  classComponents,
  classGuests,
  finalizationRevisions,
  students,
  trainingClasses,
  trainingSites,
  users,
} from "@/server/db/schema";

import type {
  ClassSignInRecord,
  ClassSignInRecordDay,
  ClassSignInRecordEntry,
  ClassSignInRecordRemovedEntry,
} from "./pdf";

export interface SignInRecordActor {
  id: string;
  username: string;
}

export interface SignInRecordRow {
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
}

export function buildClassSignInRecord(
  rows: SignInRecordRow[],
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

export interface SignInCheckInRow {
  attendanceId: string;
  checkInDate: string;
  checkedInAt: Date;
  signInMethod: string;
  renderedText: string;
  textVersion: number;
  originatingIp: string;
  rememberedDeviceId: string | null;
}

/**
 * Build the initial-certification record from daily check-ins. The attendance
 * rows supply the stable roster facts; each check-in supplies that date's entry
 * and attestation facts.
 */
export function buildClassSignInRecordFromCheckIns(
  rows: SignInRecordRow[],
  checkIns: SignInCheckInRow[],
  classInfo: {
    classId: string;
    courseName: string;
    siteName: string | null;
    hostAgencyName: string;
    deliveryMethod: string;
    generatedAt: Date;
  },
): ClassSignInRecord {
  const activeRows = rows.filter((row) => !row.removedAt);
  const byAttendance = new Map(
    activeRows.map((row) => [row.attendanceId, row]),
  );
  const days = new Map<string, ClassSignInRecordEntry[]>();
  for (const checkIn of checkIns) {
    const row = byAttendance.get(checkIn.attendanceId);
    if (!row) continue;
    const entry: ClassSignInRecordEntry = {
      attendanceId: row.attendanceId,
      participantName: participantName(row),
      participantType: row.studentId ? "regular" : "guest",
      agencyName: row.agencyName,
      signInMethod: checkIn.signInMethod,
      creditedHours: row.creditedHours,
      signedInAt: checkIn.checkedInAt,
      attestation: {
        renderedText: checkIn.renderedText,
        textVersion: checkIn.textVersion,
        confirmedAt: checkIn.checkedInAt,
        originatingIp: checkIn.originatingIp,
        rememberedDeviceId: checkIn.rememberedDeviceId,
      },
    };
    const entries = days.get(checkIn.checkInDate) ?? [];
    entries.push(entry);
    days.set(checkIn.checkInDate, entries);
  }
  const dayRecords: ClassSignInRecordDay[] = [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, entries]) => ({
      date,
      entries: entries.sort(
        (left, right) => left.signedInAt.getTime() - right.signedInAt.getTime(),
      ),
    }));
  const mapped = rows.map((row) => {
    const participantNameValue = participantName(row);
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
      participantName: participantNameValue,
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
  });
  return {
    ...classInfo,
    active: mapped.filter(
      (entry): entry is ClassSignInRecordEntry => !("removedAt" in entry),
    ),
    removed: mapped.filter(
      (entry): entry is ClassSignInRecordRemovedEntry => "removedAt" in entry,
    ),
    ...(dayRecords.length ? { days: dayRecords } : {}),
  };
}

function participantName(row: SignInRecordRow): string {
  return row.studentId
    ? `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim()
    : `${row.guestFirstName ?? ""} ${row.guestLastName ?? ""}`.trim();
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

async function readCheckIns(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<SignInCheckInRow[]> {
  return transaction
    .select({
      attendanceId: attendanceCheckIns.attendanceId,
      checkInDate: attendanceCheckIns.checkInDate,
      checkedInAt: attendanceCheckIns.checkedInAt,
      signInMethod: attendanceCheckIns.signInMethod,
      renderedText: attendanceCheckIns.renderedText,
      textVersion: attendanceCheckIns.textVersion,
      originatingIp: attendanceCheckIns.originatingIp,
      rememberedDeviceId: attendanceCheckIns.rememberedDeviceId,
    })
    .from(attendanceCheckIns)
    .innerJoin(attendance, eq(attendance.id, attendanceCheckIns.attendanceId))
    .where(eq(attendance.classId, classId))
    .orderBy(
      asc(attendanceCheckIns.checkInDate),
      asc(attendanceCheckIns.checkedInAt),
    );
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
        status: trainingClasses.status,
        courseName: sql<string>`coalesce(${trainingClasses.name}, '')`,
        siteName: trainingSites.name,
        deliveryMethod: trainingClasses.deliveryMethod,
        courseType: trainingClasses.courseType,
        hostAgencyName: agencies.name,
      })
      .from(trainingClasses)
      .leftJoin(
        trainingSites,
        eq(trainingSites.id, trainingClasses.trainingSiteId),
      )
      .innerJoin(agencies, eq(agencies.id, trainingClasses.hostAgencyId))
      .where(eq(trainingClasses.id, classId))
      .limit(1);
    if (!classRow) throw new Error("Sign-in record unavailable.");
    if (classRow.status === CLASS_STATUSES.FINALIZED) {
      const [revision] = await transaction
        .select({ encryptedSnapshot: finalizationRevisions.encryptedSnapshot })
        .from(finalizationRevisions)
        .where(eq(finalizationRevisions.classId, classId))
        .orderBy(desc(finalizationRevisions.revisionNumber))
        .limit(1);
      if (revision) {
        try {
          const frozen = buildClassSignInRecordFromSnapshot(
            JSON.parse(decryptCredential(revision.encryptedSnapshot)),
          );
          if (frozen) return frozen;
        } catch {
          // Fall through to the live record for an unreadable legacy snapshot.
        }
      }
    }
    const [rows, components, checkIns] = await Promise.all([
      readRows(transaction, classId),
      transaction
        .select({ method: classComponents.method })
        .from(classComponents)
        .where(eq(classComponents.classId, classId)),
      classRow.courseType === "initial_certification"
        ? readCheckIns(transaction, classId)
        : Promise.resolve([]),
    ]);
    const classInfo = {
      classId: classRow.classId,
      courseName: classRow.courseName,
      siteName: classRow.siteName,
      hostAgencyName: classRow.hostAgencyName,
      deliveryMethod:
        deliveryMethodsFromComponentMethods(
          components.map((component) => component.method),
        ) || classRow.deliveryMethod,
      generatedAt: new Date(),
    };
    return classRow.courseType === "initial_certification" && checkIns.length
      ? buildClassSignInRecordFromCheckIns(rows, checkIns, classInfo)
      : buildClassSignInRecord(rows, classInfo);
  });
}

function snapshotDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function hydrateEntry<T extends ClassSignInRecordEntry>(entry: T): T {
  return {
    ...entry,
    signedInAt: snapshotDate(entry.signedInAt),
    attestation: entry.attestation
      ? {
          ...entry.attestation,
          confirmedAt: snapshotDate(entry.attestation.confirmedAt),
        }
      : null,
  };
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
  const typedRecord = record as ClassSignInRecord;
  const snapshotWithComponents = snapshot as { components?: unknown };
  const components = Array.isArray(snapshotWithComponents.components)
    ? snapshotWithComponents.components
    : [];
  const deliveryFromSessions = deliveryMethodsFromComponentMethods(
    components.map((component) => {
      if (typeof component !== "object" || component === null) return null;
      const method = (component as { method?: unknown }).method;
      return typeof method === "string" ? method : null;
    }),
  );
  return {
    ...typedRecord,
    generatedAt: snapshotDate(typedRecord.generatedAt),
    active: typedRecord.active.map(hydrateEntry),
    removed: typedRecord.removed.map((entry) => ({
      ...hydrateEntry(entry),
      removedAt: snapshotDate(entry.removedAt),
    })),
    ...(typedRecord.days
      ? {
          days: typedRecord.days.map((day) => ({
            ...day,
            entries: day.entries.map(hydrateEntry),
          })),
        }
      : {}),
    deliveryMethod:
      deliveryFromSessions ||
      formatDeliveryMethods(typedRecord.deliveryMethod) ||
      typedRecord.deliveryMethod,
  };
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
  return [CLASS_STATUSES.OPEN, CLASS_STATUSES.FINALIZED].includes(
    classStatus as typeof CLASS_STATUSES.OPEN,
  );
}

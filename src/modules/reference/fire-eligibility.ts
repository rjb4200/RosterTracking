import "server-only";

import { isValidFfn } from "./credential-format";
import { decryptCredential } from "./crypto";

export interface FireEligibilitySnapshot {
  attendance: Array<{ attendanceId: string; fireEligible?: boolean }>;
  fieldSnapshots?: Array<{
    attendanceId: string;
    studentField: string;
    encryptedValue: string;
  }>;
  credentialSnapshots?: Array<{
    attendanceId: string;
    credentialTypeCode?: string;
    encryptedValue: string;
  }>;
}

/**
 * Fire inclusion from retained credential snapshots. Used for revisions that
 * predate the stored `fireEligible` fact. A missing or non-conforming FFN is
 * not eligible; an unreadable value is treated the same way rather than failing
 * the whole roster.
 */
export function isFireEligibleFromSnapshots(
  snapshot: FireEligibilitySnapshot,
  attendanceId: string,
): boolean {
  const credential = snapshot.credentialSnapshots?.find(
    (value) =>
      value.attendanceId === attendanceId && value.credentialTypeCode === "ffn",
  );
  const field = snapshot.fieldSnapshots?.find(
    (value) =>
      value.attendanceId === attendanceId && value.studentField === "ffn",
  );
  const value = credential ?? field;
  if (!value) return false;
  try {
    return isValidFfn(decryptCredential(value.encryptedValue));
  } catch {
    return false;
  }
}

/** The attendee's frozen Fire inclusion, falling back to legacy snapshots. */
export function isAttendanceFireEligible(
  snapshot: FireEligibilitySnapshot,
  attendanceId: string,
): boolean {
  const attendee = snapshot.attendance.find(
    (entry) => entry.attendanceId === attendanceId,
  );
  if (attendee?.fireEligible !== undefined) return attendee.fireEligible;
  return isFireEligibleFromSnapshots(snapshot, attendanceId);
}

/** The Fire-eligible subset of a revision's attendees. */
export function fireEligibleAttendance<
  T extends { attendanceId: string; fireEligible?: boolean },
>(
  snapshot: Omit<FireEligibilitySnapshot, "attendance"> & { attendance: T[] },
): T[] {
  return snapshot.attendance.filter((attendee) =>
    isAttendanceFireEligible(
      snapshot as FireEligibilitySnapshot,
      attendee.attendanceId,
    ),
  );
}

export function countFireEligible(snapshot: FireEligibilitySnapshot): number {
  return snapshot.attendance.filter((attendee) =>
    isAttendanceFireEligible(snapshot, attendee.attendanceId),
  ).length;
}

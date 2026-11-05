export const CERTIFICATE_DISPOSITION_DECISIONS = [
  "include",
  "exclude",
] as const;

export type CertificateDispositionDecision =
  (typeof CERTIFICATE_DISPOSITION_DECISIONS)[number];

export interface DailyCheckInFact {
  attendanceId: string;
  checkInDate: string;
}

export interface CertificateDispositionFact {
  attendanceId: string;
  decision: CertificateDispositionDecision;
  note: string;
}

export interface MissingDayStudent {
  attendanceId: string;
  missingDates: string[];
}

/** The distinct department-calendar dates with at least one check-in. */
export function inferClassDays(
  checkIns: readonly DailyCheckInFact[],
): string[] {
  return [...new Set(checkIns.map((checkIn) => checkIn.checkInDate))].sort();
}

/**
 * Active attendees missing one or more inferred class days. A class with no
 * check-ins has no inferred days and therefore no missing-day students.
 */
export function missingClassDays(
  attendanceIds: readonly string[],
  checkIns: readonly DailyCheckInFact[],
): MissingDayStudent[] {
  const classDays = inferClassDays(checkIns);
  if (classDays.length === 0) return [];
  const attended = new Map<string, Set<string>>();
  for (const checkIn of checkIns) {
    const days = attended.get(checkIn.attendanceId) ?? new Set<string>();
    days.add(checkIn.checkInDate);
    attended.set(checkIn.attendanceId, days);
  }
  return attendanceIds.flatMap((attendanceId) => {
    const days = attended.get(attendanceId) ?? new Set<string>();
    const missingDates = classDays.filter((day) => !days.has(day));
    return missingDates.length ? [{ attendanceId, missingDates }] : [];
  });
}

export function isCertificateExcluded(
  dispositions: readonly CertificateDispositionFact[],
  attendanceId: string,
): boolean {
  return dispositions.some(
    (disposition) =>
      disposition.attendanceId === attendanceId &&
      disposition.decision === "exclude",
  );
}

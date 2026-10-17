import type { ReportPeriod } from "./period";

/**
 * One row as returned by the transcript query: a single active attendance of
 * the student in an in-period, non-cancelled class whose class date is the
 * earliest component start.
 */
export interface StudentTranscriptSourceRow {
  classId: string;
  course: string;
  classDate: string;
  emsCategoryName: string | null;
  reportsToKbems: boolean;
  revisionId: string | null;
  attendanceId: string;
  creditedHours: number;
}

export interface StudentTranscriptRow {
  classId: string;
  attendanceId: string;
  revisionId: string | null;
  date: Date;
  course: string;
  category: string;
  hours: number;
}

export interface StudentTranscript {
  period: ReportPeriod;
  rows: StudentTranscriptRow[];
  totalHours: number;
}

/**
 * Classifies a delivered class exactly once for the log. The recorded EMS
 * category wins; a class reported to KBEMS without a category is
 * "Uncategorized"; anything else (a Fire-only class) is "Other". Because a
 * class carries one EMS category at most, a dual Fire + KBEMS class lands in a
 * single bucket and can never appear twice.
 */
export function classifyCeCategory(input: {
  emsCategoryName: string | null;
  reportsToKbems: boolean;
}): string {
  if (input.emsCategoryName) return input.emsCategoryName;
  if (input.reportsToKbems) return "Uncategorized";
  return "Other";
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Builds the flat transcript, ordered by category (then date within a category)
 * so the reader can line the delivered hours up against the requirements block.
 * Rows are keyed on the class so a student's attendance can only ever produce
 * one line per class; the total sums the per-student credited hours.
 */
export function buildStudentTranscript(
  rows: readonly StudentTranscriptSourceRow[],
  period: ReportPeriod,
): StudentTranscript {
  const byClass = new Map<string, StudentTranscriptRow>();
  for (const row of rows) {
    if (byClass.has(row.classId)) continue;
    byClass.set(row.classId, {
      classId: row.classId,
      attendanceId: row.attendanceId,
      revisionId: row.revisionId,
      date: new Date(row.classDate),
      course: row.course,
      category: classifyCeCategory({
        emsCategoryName: row.emsCategoryName,
        reportsToKbems: row.reportsToKbems,
      }),
      hours: row.creditedHours,
    });
  }
  const mapped = [...byClass.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.date.getTime() - b.date.getTime() ||
      a.classId.localeCompare(b.classId),
  );
  return {
    period,
    rows: mapped,
    totalHours: round(mapped.reduce((sum, row) => sum + row.hours, 0)),
  };
}

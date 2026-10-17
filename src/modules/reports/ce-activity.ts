import { classifyCeCategory } from "./ce-transcript";
import type { ReportPeriod } from "./period";

/** One row as returned by an agency or site activity query. */
export interface ActivitySourceRow {
  classId: string;
  course: string;
  classDate: string;
  emsCategoryName: string | null;
  reportsToKbems: boolean;
  classHours: number;
  /** Attendee display names in the report's scope (the agency's people, or all). */
  attendees: string[];
}

export interface ActivityReportRow {
  classId: string;
  date: Date;
  course: string;
  category: string;
  hours: number;
  attendees: string[];
}

export interface ActivityReport {
  period: ReportPeriod;
  rows: ActivityReportRow[];
  totalHours: number;
  totalAttendees: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Builds the agency/site "training delivered" report from its scoped rows. */
export function buildActivityReport(
  rows: readonly ActivitySourceRow[],
  period: ReportPeriod,
): ActivityReport {
  const mapped = rows
    .map((row) => ({
      classId: row.classId,
      date: new Date(row.classDate),
      course: row.course,
      category: classifyCeCategory({
        emsCategoryName: row.emsCategoryName,
        reportsToKbems: row.reportsToKbems,
      }),
      hours: row.classHours,
      attendees: [...row.attendees],
    }))
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        a.classId.localeCompare(b.classId),
    );
  return {
    period,
    rows: mapped,
    totalHours: round(mapped.reduce((sum, row) => sum + row.hours, 0)),
    totalAttendees: mapped.reduce((sum, row) => sum + row.attendees.length, 0),
  };
}

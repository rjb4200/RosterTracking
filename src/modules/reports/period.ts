import { parseDepartmentDateTime } from "@/modules/classes/time";

/** Half-open instant range: from is inclusive, to is exclusive. */
export interface ReportPeriod {
  from: Date;
  to: Date;
}

export function validateReportPeriod(period: ReportPeriod): ReportPeriod {
  if (
    !Number.isFinite(period.from.getTime()) ||
    !Number.isFinite(period.to.getTime()) ||
    period.from >= period.to
  ) {
    throw new Error(
      "Select a valid report period with the end after the start.",
    );
  }
  return period;
}

/** Date picker values include both days, interpreted in department local time. */
export function parseReportPeriod(from: string, to: string): ReportPeriod {
  const parseDay = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("Select both report dates (YYYY-MM-DD).");
    }
    const day = new Date(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(day.getTime()) ||
      day.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("Select valid calendar dates.");
    }
    return day;
  };
  const first = parseDay(from);
  const last = parseDay(to);
  if (first > last)
    throw new Error("The end date cannot precede the start date.");
  last.setUTCDate(last.getUTCDate() + 1);
  return validateReportPeriod({
    from: parseDepartmentDateTime(`${from}T00:00`),
    to: parseDepartmentDateTime(`${last.toISOString().slice(0, 10)}T00:00`),
  });
}

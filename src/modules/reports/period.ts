import {
  getDepartmentCalendarDate,
  parseDepartmentDateTime,
} from "@/modules/classes/time";

/** Half-open instant range: from is inclusive, to is exclusive. */
export interface ReportPeriod {
  from: Date;
  to: Date;
}

/** A two-year KBEMS renewal cycle, identified by the year it ends (12/31). */
export interface RenewalCyclePreset {
  id: string;
  label: string;
  /** Inclusive first day, as a date-picker value (YYYY-MM-DD). */
  from: string;
  /** Inclusive last day, as a date-picker value (YYYY-MM-DD). */
  to: string;
  endYear: number;
}

const cycleWindow = (endYear: number): { from: string; to: string } => ({
  from: `${endYear - 1}-01-01`,
  to: `${endYear}-12-31`,
});

/**
 * The last, current, and next two-year renewal cycles ending 12/31, derived
 * from the cycle rule and the department calendar year rather than stored, so
 * the offered presets advance each year without configuration. Cycles of both
 * parities are offered because clinicians renew on odd or even end-years.
 */
export function renewalCyclePresets(
  today: Date = new Date(),
): RenewalCyclePreset[] {
  const year = Number(getDepartmentCalendarDate(today).slice(0, 4));
  return [year - 1, year, year + 1].map((endYear) => {
    const window = cycleWindow(endYear);
    return {
      id: `cycle-${endYear}`,
      endYear,
      label: `${endYear} renewal (${window.from} through ${window.to})`,
      ...window,
    };
  });
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

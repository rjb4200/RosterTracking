const DEPARTMENT_TIME_ZONE =
  process.env.DEPARTMENT_TIME_ZONE ?? "America/New_York";

try {
  new Intl.DateTimeFormat("en-US", { timeZone: DEPARTMENT_TIME_ZONE });
} catch {
  throw new Error(
    `DEPARTMENT_TIME_ZONE must be a valid IANA time zone: ${DEPARTMENT_TIME_ZONE}`,
  );
}

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function partsAt(date: Date): DateTimeParts {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DEPARTMENT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  const value = (name: keyof DateTimeParts) => {
    const part = values[name];
    if (part === undefined)
      throw new Error("Could not resolve department time.");
    return part;
  };
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

export function parseDepartmentDateTime(value: string): Date {
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime()))
      throw new Error("Enter a valid date and time.");
    return instant;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date and time.");
  const desired = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  let timestamp = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = partsAt(new Date(timestamp));
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    timestamp += desired - represented;
  }
  const result = new Date(timestamp);
  const parts = partsAt(result);
  if (
    parts.year !== Number(match[1]) ||
    parts.month !== Number(match[2]) ||
    parts.day !== Number(match[3]) ||
    parts.hour !== Number(match[4]) ||
    parts.minute !== Number(match[5])
  ) {
    throw new Error(
      "That local time does not exist in the department time zone.",
    );
  }
  return result;
}

export function formatDepartmentDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: DEPARTMENT_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDepartmentDateTimeInput(date: Date): string {
  const parts = partsAt(date);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function getDepartmentCalendarDate(date: Date): string {
  return formatDepartmentDateTimeInput(date).slice(0, 10);
}

export function roundDepartmentDateTimeToQuarterHour(date: Date): string {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.round(rounded.getMinutes() / 15) * 15);
  return formatDepartmentDateTimeInput(rounded);
}

export function calculateDepartmentEndTimeInput(
  startsAt: string,
  creditedHours: number,
): string {
  return formatDepartmentDateTimeInput(
    new Date(
      parseDepartmentDateTime(startsAt).getTime() +
        creditedHours * 60 * 60 * 1000,
    ),
  );
}

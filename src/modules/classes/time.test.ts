import { describe, expect, it } from "vitest";

import {
  calculateDepartmentEndTimeInput,
  formatDepartmentDateTimeInput,
  normalizeDepartmentStartTime,
  normalizeDepartmentStartTimeInput,
  parseDepartmentDateTime,
  roundDepartmentDateTimeToQuarterHour,
} from "./time";

describe("department class times", () => {
  it("converts local department time to a timezone-aware instant", () => {
    const instant = parseDepartmentDateTime("2026-09-10T09:00");
    expect(instant.toISOString()).toBe("2026-09-10T13:00:00.000Z");
    expect(formatDepartmentDateTimeInput(instant)).toBe("2026-09-10T09:00");
  });

  it("rejects a local time skipped by daylight saving time", () => {
    expect(() => parseDepartmentDateTime("2026-03-08T02:30")).toThrow(
      /does not exist/i,
    );
  });

  it("rounds new session starts and calculates local end-time displays", () => {
    expect(
      roundDepartmentDateTimeToQuarterHour(
        new Date("2026-09-10T13:08:00.000Z"),
      ),
    ).toBe("2026-09-10T09:15");
    expect(calculateDepartmentEndTimeInput("2026-09-10T09:15", 1.25)).toBe(
      "2026-09-10T10:30",
    );
  });

  it("rounds to the nearest quarter hour on both sides of the midpoint", () => {
    // 13:07Z is 09:07 local; 13:08Z is 09:08 local.
    expect(
      roundDepartmentDateTimeToQuarterHour(
        new Date("2026-09-10T13:07:00.000Z"),
      ),
    ).toBe("2026-09-10T09:00");
    expect(
      roundDepartmentDateTimeToQuarterHour(
        new Date("2026-09-10T13:08:00.000Z"),
      ),
    ).toBe("2026-09-10T09:15");
  });

  it("rolls a rounded start into the next day", () => {
    // 03:53Z is 23:53 local on the 10th; nearest rounding reaches midnight.
    expect(
      roundDepartmentDateTimeToQuarterHour(
        new Date("2026-09-11T03:53:00.000Z"),
      ),
    ).toBe("2026-09-11T00:00");
  });

  it("normalizes an entered start time onto the 15-minute cadence", () => {
    expect(normalizeDepartmentStartTimeInput("2026-09-10T09:07")).toBe(
      "2026-09-10T09:00",
    );
    expect(normalizeDepartmentStartTimeInput("2026-09-10T09:08")).toBe(
      "2026-09-10T09:15",
    );
    // A normalized value parses to the same instant as its rounded string.
    expect(normalizeDepartmentStartTime("2026-09-10T09:07").toISOString()).toBe(
      parseDepartmentDateTime("2026-09-10T09:00").toISOString(),
    );
  });
});

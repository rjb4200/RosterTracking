import { describe, expect, it } from "vitest";

import {
  calculateDepartmentEndTimeInput,
  formatDepartmentDateTimeInput,
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
});

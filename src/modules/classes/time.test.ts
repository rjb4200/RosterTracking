import { describe, expect, it } from "vitest";

import { formatDepartmentDateTimeInput, parseDepartmentDateTime } from "./time";

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
});

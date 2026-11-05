import { describe, expect, it } from "vitest";

import {
  inferClassDays,
  isCertificateExcluded,
  missingClassDays,
} from "./daily-check-ins";

describe("daily class check-ins", () => {
  it("infers class days from distinct check-in dates", () => {
    expect(
      inferClassDays([
        { attendanceId: "a", checkInDate: "2026-09-12" },
        { attendanceId: "b", checkInDate: "2026-09-10" },
        { attendanceId: "a", checkInDate: "2026-09-10" },
      ]),
    ).toEqual(["2026-09-10", "2026-09-12"]);
  });

  it("flags students missing one or more class days", () => {
    expect(
      missingClassDays(
        ["a", "b"],
        [
          { attendanceId: "a", checkInDate: "2026-09-10" },
          { attendanceId: "a", checkInDate: "2026-09-12" },
          { attendanceId: "b", checkInDate: "2026-09-10" },
        ],
      ),
    ).toEqual([{ attendanceId: "b", missingDates: ["2026-09-12"] }]);
  });

  it("does not flag a class with no check-ins", () => {
    expect(missingClassDays(["a", "b"], [])).toEqual([]);
  });

  it("recognizes an excluded certificate disposition", () => {
    expect(
      isCertificateExcluded(
        [{ attendanceId: "a", decision: "exclude", note: "Missed day" }],
        "a",
      ),
    ).toBe(true);
    expect(
      isCertificateExcluded(
        [{ attendanceId: "a", decision: "include", note: "Make-up done" }],
        "a",
      ),
    ).toBe(false);
  });
});

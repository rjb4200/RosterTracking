import { describe, expect, it } from "vitest";

import { CLASS_STATUSES } from "./constants";
import {
  calculateComponentEndTime,
  validateClassReadiness,
  validateClassTransition,
  validateComponentRange,
  validateFinalizationTransition,
  validateReopenReason,
  validateReportingStatusTransition,
} from "./policy";

describe("class policy", () => {
  it("requires a valid component time range and positive hours", () => {
    const startsAt = new Date("2026-09-10T13:00:00Z");
    expect(() =>
      validateComponentRange(startsAt, new Date("2026-09-10T12:00:00Z"), 1),
    ).toThrow(/end time/i);
    expect(() =>
      validateComponentRange(startsAt, new Date("2026-09-10T14:00:00Z"), 0),
    ).toThrow(/greater than zero/i);
  });

  it("calculates component ends from quarter-hour starts and credits", () => {
    const startsAt = new Date("2026-09-10T13:15:00Z");
    expect(calculateComponentEndTime(startsAt, 1.25).toISOString()).toBe(
      "2026-09-10T14:30:00.000Z",
    );
    expect(() => calculateComponentEndTime(startsAt, 1.1)).toThrow(
      /15-minute increment/i,
    );
    expect(() =>
      calculateComponentEndTime(new Date("2026-09-10T13:16:00Z"), 1),
    ).toThrow(/15-minute increment/i);
  });

  it("allows only supported lifecycle transitions", () => {
    expect(() =>
      validateClassTransition(
        CLASS_STATUSES.OPEN,
        CLASS_STATUSES.CANCELLED,
        "Cancelled",
      ),
    ).not.toThrow();
    expect(() =>
      validateClassTransition(CLASS_STATUSES.OPEN, CLASS_STATUSES.FINALIZED),
    ).toThrow(/cannot transition/i);
    expect(() =>
      validateClassTransition(CLASS_STATUSES.OPEN, CLASS_STATUSES.CANCELLED),
    ).toThrow(/reason/i);
    expect(() =>
      validateClassTransition(
        CLASS_STATUSES.FINALIZED,
        CLASS_STATUSES.CANCELLED,
        "Cancelled",
      ),
    ).toThrow(/cannot transition/i);
  });

  it("requires exactly one lead instructor before opening", () => {
    expect(() =>
      validateClassReadiness({
        componentCount: 1,
        leadCount: 0,
        reportingCount: 1,
        hostAgencyActive: true,
      }),
    ).toThrow(/one lead instructor/i);
    expect(() =>
      validateClassReadiness({
        componentCount: 1,
        leadCount: 1,
        reportingCount: 1,
        hostAgencyActive: true,
      }),
    ).not.toThrow();
  });

  it("requires an active host agency before opening", () => {
    expect(() =>
      validateClassReadiness({
        componentCount: 1,
        leadCount: 1,
        reportingCount: 1,
        hostAgencyActive: false,
      }),
    ).toThrow(/host agency/i);
  });

  it("allows finalization only for an open class and requires reopen reasons", () => {
    expect(() =>
      validateFinalizationTransition(CLASS_STATUSES.OPEN),
    ).not.toThrow();
    expect(() =>
      validateFinalizationTransition(CLASS_STATUSES.FINALIZED),
    ).toThrow(/open/i);
    expect(() => validateReopenReason(" ")).toThrow(/reason/i);
  });

  it("keeps reporting destination transitions independent and correction notes explicit", () => {
    expect(() =>
      validateReportingStatusTransition("pending", "needs_correction"),
    ).toThrow(/notes/i);
    expect(() =>
      validateReportingStatusTransition("entered", "pending"),
    ).toThrow(/corrected/i);
    expect(() =>
      validateReportingStatusTransition("pending", "entered", "submitted"),
    ).not.toThrow();
    expect(() =>
      validateReportingStatusTransition("pending", "not_required"),
    ).not.toThrow();
  });
});

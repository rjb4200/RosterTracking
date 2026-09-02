import { describe, expect, it } from "vitest";

import { CLASS_STATUSES } from "./constants";
import {
  validateClassReadiness,
  validateClassTransition,
  validateComponentRange,
  validateDeliverySite,
} from "./policy";

describe("class policy", () => {
  it("requires a site for in-person delivery", () => {
    expect(() => validateDeliverySite("in_person", null)).toThrow(
      /site is required/i,
    );
    expect(() => validateDeliverySite("virtual", null)).not.toThrow();
  });

  it("requires a valid component time range and positive hours", () => {
    const startsAt = new Date("2026-09-10T13:00:00Z");
    expect(() =>
      validateComponentRange(startsAt, new Date("2026-09-10T12:00:00Z"), 1),
    ).toThrow(/end time/i);
    expect(() =>
      validateComponentRange(startsAt, new Date("2026-09-10T14:00:00Z"), 0),
    ).toThrow(/greater than zero/i);
  });

  it("allows only supported lifecycle transitions", () => {
    expect(() =>
      validateClassTransition(CLASS_STATUSES.DRAFT, CLASS_STATUSES.OPEN),
    ).not.toThrow();
    expect(() =>
      validateClassTransition(CLASS_STATUSES.OPEN, CLASS_STATUSES.FINALIZED),
    ).toThrow(/cannot transition/i);
    expect(() =>
      validateClassTransition(CLASS_STATUSES.OPEN, CLASS_STATUSES.CANCELLED),
    ).toThrow(/reason/i);
  });

  it("requires exactly one lead instructor before opening", () => {
    expect(() =>
      validateClassReadiness({
        componentCount: 1,
        leadCount: 0,
        reportingCount: 1,
      }),
    ).toThrow(/one lead instructor/i);
    expect(() =>
      validateClassReadiness({
        componentCount: 1,
        leadCount: 1,
        reportingCount: 1,
      }),
    ).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";

import { hasElevatedRosterAccess, validateCreditedHours } from "./services";

describe("instructor roster policy", () => {
  it("allows scheduled credit and requires a reason for an adjustment", () => {
    expect(() => validateCreditedHours(4, 4)).not.toThrow();
    expect(() => validateCreditedHours(3.5, 4)).toThrow(/reason/i);
    expect(() => validateCreditedHours(3.5, 4, "Left early")).not.toThrow();
  });

  it("rejects credit outside the scheduled total", () => {
    expect(() => validateCreditedHours(-0.01, 4, "Incorrect")).toThrow(
      /between zero/i,
    );
    expect(() => validateCreditedHours(4.01, 4, "Incorrect")).toThrow(
      /between zero/i,
    );
  });

  it("grants department roster access only to elevated roles", () => {
    expect(hasElevatedRosterAccess(["administrator"])).toBe(true);
    expect(hasElevatedRosterAccess(["training-major"])).toBe(true);
    expect(hasElevatedRosterAccess(["instructor"])).toBe(false);
  });
});

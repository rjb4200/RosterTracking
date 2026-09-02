import { describe, expect, it } from "vitest";

import {
  credentialMaskedSuffix,
  formatCredentialDisplay,
  normalizePhone,
} from "./masking";

describe("credential masking", () => {
  it("returns the last four characters", () => {
    expect(credentialMaskedSuffix("FF123456")).toBe("3456");
  });

  it("returns the whole value when shorter than four", () => {
    expect(credentialMaskedSuffix("12")).toBe("12");
  });

  it("formats a display string", () => {
    expect(formatCredentialDisplay("FF123456")).toBe("ending 3456");
  });
});

describe("phone normalization", () => {
  it("normalizes a 10-digit number", () => {
    expect(normalizePhone("(859) 555-1234")).toBe("+18595551234");
  });

  it("keeps an 11-digit number", () => {
    expect(normalizePhone("18595551234")).toBe("+18595551234");
  });

  it("rejects non-US and incomplete numbers", () => {
    expect(() => normalizePhone("44 20 7946 0958")).toThrow(/10-digit US/i);
    expect(() => normalizePhone("555-1234")).toThrow(/10-digit US/i);
    expect(() => normalizePhone("28595551234")).toThrow(/10-digit US/i);
    expect(() => normalizePhone("859-555-1234 ext 2")).toThrow(/10-digit US/i);
  });
});

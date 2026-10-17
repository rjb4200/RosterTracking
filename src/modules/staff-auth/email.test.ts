import { describe, expect, it } from "vitest";

import { needsEmailPrompt, normalizeEmail } from "./email";

describe("staff email normalization", () => {
  it("trims and lower-cases an email", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("accepts a plain address", () => {
    expect(normalizeEmail("lead.medic@winchesterfireems.com")).toBe(
      "lead.medic@winchesterfireems.com",
    );
  });

  it("rejects a value that is not an email", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow();
  });

  it("rejects a blank value", () => {
    expect(() => normalizeEmail("   ")).toThrow();
  });
});

describe("staff email prompt", () => {
  it("prompts when no email is set", () => {
    expect(needsEmailPrompt(null)).toBe(true);
    expect(needsEmailPrompt(undefined)).toBe(true);
    expect(needsEmailPrompt("")).toBe(true);
    expect(needsEmailPrompt("   ")).toBe(true);
  });

  it("does not prompt once an email is set", () => {
    expect(needsEmailPrompt("ada@example.com")).toBe(false);
  });
});

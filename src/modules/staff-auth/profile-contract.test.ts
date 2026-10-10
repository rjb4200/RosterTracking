import { describe, expect, it } from "vitest";

import { parseProfileInput } from "./profile-contract";

function input(ffn: string) {
  return { ffn, instructorLevel: "", emsProviderNumber: "" };
}

describe("profile firefighter number", () => {
  it("accepts the canonical firefighter number", () => {
    expect(parseProfileInput(input("1234-5678")).ffn).toBe("1234-5678");
  });

  it("rejects a legacy digits-only firefighter number", () => {
    expect(() => parseProfileInput(input("06344600"))).toThrow(/0000-0000/i);
  });

  it("rejects a non-digit firefighter number", () => {
    expect(() => parseProfileInput(input("ABC123"))).toThrow(/0000-0000/i);
  });

  it("accepts an empty firefighter number", () => {
    expect(parseProfileInput(input("")).ffn).toBeNull();
  });
});

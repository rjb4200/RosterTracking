import { describe, expect, it } from "vitest";

import { parseProfileInput } from "./profile-contract";

function input(ffn: string) {
  return { ffn, instructorLevel: "", emsProviderNumber: "" };
}

describe("profile firefighter number", () => {
  it("accepts a digits-only firefighter number", () => {
    expect(parseProfileInput(input("123456")).ffn).toBe("123456");
  });

  it("rejects a dashed firefighter number", () => {
    expect(() => parseProfileInput(input("0634-4600"))).toThrow(/digits only/i);
  });

  it("rejects a non-digit firefighter number", () => {
    expect(() => parseProfileInput(input("ABC123"))).toThrow(/digits only/i);
  });

  it("accepts an empty firefighter number", () => {
    expect(parseProfileInput(input("")).ffn).toBeNull();
  });
});

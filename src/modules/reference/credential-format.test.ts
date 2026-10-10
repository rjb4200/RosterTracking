import { describe, expect, it } from "vitest";

import {
  credentialValuePattern,
  FFN_VALUE_PATTERN,
  isValidFfn,
  validateCredentialValue,
} from "./credential-format";

describe("credential value formats", () => {
  it("validates the canonical FFN while treating legacy numbers as invalid", () => {
    expect(isValidFfn("0000-0000")).toBe(true);
    expect(isValidFfn("1234-5678")).toBe(true);
    expect(isValidFfn("12345678")).toBe(false);
    expect(isValidFfn("123-45678")).toBe(false);
    expect(isValidFfn(null)).toBe(false);
    expect(credentialValuePattern("ffn")).toBe(FFN_VALUE_PATTERN);
  });

  it("rejects a malformed FFN without restricting other credential types", () => {
    expect(validateCredentialValue(" 1234-5678 ", { code: "ffn" })).toBe(
      "1234-5678",
    );
    expect(() => validateCredentialValue("12345678", { code: "ffn" })).toThrow(
      /0000-0000/,
    );
    expect(validateCredentialValue(" EMS 42 ", { code: "kemsis" })).toBe(
      "EMS 42",
    );
  });

  it("uses a credential type's configured pattern when present", () => {
    expect(() =>
      validateCredentialValue("a1", {
        code: "other",
        valuePattern: "^[A-Z]+$",
      }),
    ).toThrow(/valid credential/);
    expect(
      validateCredentialValue(" ABC ", {
        code: "other",
        valuePattern: "^[A-Z]+$",
      }),
    ).toBe("ABC");
  });
});

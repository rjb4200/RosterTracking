import { describe, expect, it } from "vitest";

import {
  credentialValuePattern,
  FFN_VALUE_PATTERN,
  isValidCredentialValue,
  isValidFfn,
  normalizeFfn,
  validateCredentialValue,
} from "./credential-format";

describe("FFN normalization", () => {
  it("canonicalizes 8 digits with forgiven separators", () => {
    expect(normalizeFfn("12345678")).toBe("1234-5678");
    expect(normalizeFfn("1234 5678")).toBe("1234-5678");
    expect(normalizeFfn("1234.5678")).toBe("1234-5678");
    expect(normalizeFfn(" 1234-5678 ")).toBe("1234-5678");
    expect(normalizeFfn("12-34-5678")).toBe("1234-5678");
    expect(normalizeFfn("1234\u20135678")).toBe("1234-5678");
  });

  it("preserves leading zeros", () => {
    expect(normalizeFfn("01234567")).toBe("0123-4567");
    expect(normalizeFfn("0123-4567")).toBe("0123-4567");
  });

  it("passes an already-canonical value through unchanged", () => {
    expect(normalizeFfn("0000-0000")).toBe("0000-0000");
    expect(normalizeFfn("1234-5678")).toBe("1234-5678");
  });

  it("rejects any non-separator character", () => {
    expect(normalizeFfn("abc12345678")).toBeNull();
    expect(normalizeFfn("1234-5678x")).toBeNull();
    expect(normalizeFfn("1234+5678")).toBeNull();
  });

  it("rejects a wrong digit count rather than guessing", () => {
    expect(normalizeFfn("1234567")).toBeNull();
    expect(normalizeFfn("123456789")).toBeNull();
    expect(normalizeFfn("")).toBeNull();
  });
});

describe("credential value formats", () => {
  it("validates the canonical FFN while treating legacy numbers as invalid", () => {
    expect(isValidFfn("0000-0000")).toBe(true);
    expect(isValidFfn("1234-5678")).toBe(true);
    expect(isValidFfn("12345678")).toBe(false);
    expect(isValidFfn("123-45678")).toBe(false);
    expect(isValidFfn(null)).toBe(false);
    expect(credentialValuePattern("ffn")).toBe(FFN_VALUE_PATTERN);
  });

  it("normalizes a supplied FFN without restricting other credential types", () => {
    expect(validateCredentialValue(" 1234-5678 ", { code: "ffn" })).toBe(
      "1234-5678",
    );
    expect(validateCredentialValue("12345678", { code: "ffn" })).toBe(
      "1234-5678",
    );
    expect(validateCredentialValue("1234 5678", { code: "ffn" })).toBe(
      "1234-5678",
    );
    expect(validateCredentialValue(" EMS 42 ", { code: "kemsis" })).toBe(
      "EMS 42",
    );
  });

  it("rejects an FFN that cannot be normalized", () => {
    expect(() =>
      validateCredentialValue("abc1234-5678", { code: "ffn" }),
    ).toThrow(/8 digits/);
    expect(() => validateCredentialValue("1234567", { code: "ffn" })).toThrow(
      /8 digits/,
    );
  });

  it("treats a stored value's validity strictly, without normalization", () => {
    expect(isValidCredentialValue("1234-5678", { code: "ffn" })).toBe(true);
    expect(isValidCredentialValue("12345678", { code: "ffn" })).toBe(false);
    expect(isValidCredentialValue(null, { code: "ffn" })).toBe(false);
    // A type without a format accepts any non-empty value.
    expect(isValidCredentialValue("EMS 42", { code: "kemsis" })).toBe(true);
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

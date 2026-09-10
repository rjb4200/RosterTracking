import { afterEach, describe, expect, it, vi } from "vitest";

import {
  decryptClassAccessPin,
  encryptClassAccessPin,
  generateClassAccessPin,
  generateClassPublicCode,
  generateClassSignInToken,
  hashClassSignInToken,
  isClassPublicCode,
  verifyClassAccessPin,
} from "./token";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("class sign-in tokens", () => {
  it("generates unpredictable URL-safe values and stable hashes", () => {
    const first = generateClassSignInToken();
    const second = generateClassSignInToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashClassSignInToken(first)).toBe(hashClassSignInToken(first));
    expect(hashClassSignInToken(first)).not.toBe(hashClassSignInToken(second));
  });

  it("generates readable public codes", () => {
    const code = generateClassPublicCode();
    expect(code).toHaveLength(4);
    expect(isClassPublicCode(code)).toBe(true);
  });

  it("encrypts and verifies four-digit PINs without losing leading zeroes", () => {
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      Buffer.alloc(32, 7).toString("base64"),
    );
    const generated = generateClassAccessPin();
    expect(generated).toMatch(/^\d{4}$/);
    const encrypted = encryptClassAccessPin("0073");
    expect(decryptClassAccessPin(encrypted)).toBe("0073");
    expect(verifyClassAccessPin(encrypted, "0073")).toBe(true);
    expect(verifyClassAccessPin(encrypted, "0074")).toBe(false);
  });
});

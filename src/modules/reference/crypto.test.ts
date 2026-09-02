import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  credentialLookupHash,
  decryptCredential,
  encryptCredential,
  normalizeCredentialValue,
} from "./crypto";

const key = "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=";

describe("credential encryption", () => {
  beforeAll(() => {
    vi.stubEnv("CREDENTIAL_ENCRYPTION_KEY", key);
  });

  it("round-trips a credential value", () => {
    const encrypted = encryptCredential("FF-123456");
    expect(encrypted).not.toContain("FF-123456");
    expect(decryptCredential(encrypted)).toBe("FF-123456");
  });

  it("produces different ciphertext for the same value", () => {
    expect(encryptCredential("FF-123456")).not.toBe(
      encryptCredential("FF-123456"),
    );
  });

  it("derives a stable lookup hash", () => {
    expect(credentialLookupHash("FF-123456")).toBe(
      credentialLookupHash(" FF-123456"),
    );
  });

  it("uses the same exact normalization for stored and submitted credentials", () => {
    expect(normalizeCredentialValue("  FF-123456  ")).toBe("FF-123456");
    expect(credentialLookupHash("FF-123456 ")).toBe(
      credentialLookupHash("FF-123456"),
    );
    expect(credentialLookupHash("ff-123456")).not.toBe(
      credentialLookupHash("FF-123456"),
    );
    expect(() => normalizeCredentialValue("   ")).toThrow(/valid credential/i);
  });
});

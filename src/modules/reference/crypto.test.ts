import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  credentialLookupHash,
  decryptCredential,
  encryptCredential,
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
});

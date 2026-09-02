import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  decryptWorkflowState,
  encryptWorkflowState,
  keyedHash,
  verifyKeyedHash,
} from "./crypto";

describe("student sign-in cryptography", () => {
  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-at-least-32-characters");
    vi.stubEnv(
      "CREDENTIAL_ENCRYPTION_KEY",
      "WfAtPIckXdR1AkTmkBZOPGTns2gUyVLExMfK/1islVM=",
    );
  });

  it("derives stable, purpose-separated keyed hashes", () => {
    const contextHash = keyedHash("context", "value");
    expect(contextHash).toBe(keyedHash("context", "value"));
    expect(contextHash).not.toBe(keyedHash("rate-limit", "value"));
    expect(verifyKeyedHash("context", "value", contextHash)).toBe(true);
    expect(verifyKeyedHash("context", "changed", contextHash)).toBe(false);
  });

  it("encrypts workflow state and binds it to associated workflow data", () => {
    const plaintext = JSON.stringify({ phone: "5025550100" });
    const encrypted = encryptWorkflowState(
      plaintext,
      "nonce-hash-one",
      Buffer.alloc(12, 1),
    );
    expect(encrypted).not.toContain("5025550100");
    expect(decryptWorkflowState(encrypted, "nonce-hash-one")).toBe(plaintext);
    expect(() => decryptWorkflowState(encrypted, "nonce-hash-two")).toThrow();
  });

  it("rejects malformed encrypted payloads and IVs", () => {
    expect(() => decryptWorkflowState("invalid", "nonce")).toThrow(/invalid/i);
    expect(() =>
      encryptWorkflowState("value", "nonce", Buffer.alloc(8)),
    ).toThrow(/iv/i);
  });
});

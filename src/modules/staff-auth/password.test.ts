import { describe, expect, it } from "vitest";

import {
  hashPassword,
  normalizeUsername,
  validatePassword,
  verifyPassword,
} from "./password";

describe("staff password helpers", () => {
  it("normalizes a valid username", () => {
    expect(normalizeUsername("  Fire.Chief  ")).toBe("fire.chief");
  });

  it("rejects unsupported usernames", () => {
    expect(() => normalizeUsername("Fire Chief")).toThrow();
  });

  it("requires a password", () => {
    expect(() => validatePassword("")).toThrow();
  });

  it("hashes and verifies a valid password without retaining plaintext", async () => {
    const password = "correct-horse-battery-station";
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toContain(password);
    await expect(verifyPassword(passwordHash, password)).resolves.toBe(true);
    await expect(
      verifyPassword(passwordHash, "incorrect-password-value"),
    ).resolves.toBe(false);
  });
});

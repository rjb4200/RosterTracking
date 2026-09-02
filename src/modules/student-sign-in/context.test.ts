import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  createSignInContext,
  hashWorkflowNonce,
  signContext,
  signInCookieOptions,
  validateSignInContext,
} from "./context";

const classId = "a18d3d4e-8969-4d8d-9440-47a8206ad2c9";
const now = new Date("2026-09-02T12:00:00.000Z");

describe("signed sign-in context", () => {
  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-at-least-32-characters");
  });

  it("round-trips only the class binding and random workflow credentials", () => {
    const first = createSignInContext(classId, 7, now, 300);
    const second = createSignInContext(classId, 7, now, 300);

    expect(validateSignInContext(first.token, now)).toEqual(first.context);
    expect(first.context).toMatchObject({
      classId,
      tokenVersion: 7,
      expiresAt: Math.floor(now.getTime() / 1000) + 300,
    });
    expect(first.context.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.context.idempotencyKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.context.nonce).not.toBe(second.context.nonce);
    expect(first.context.idempotencyKey).not.toBe(
      second.context.idempotencyKey,
    );
  });

  it("rejects tampering, malformed values, and expiration boundaries", () => {
    const created = createSignInContext(classId, 3, now, 60);
    const [payload, signature] = created.token.split(".");
    expect(payload).toBeTruthy();
    expect(signature).toBeTruthy();
    expect(validateSignInContext(`${payload}x.${signature}`, now)).toBeNull();
    expect(validateSignInContext("not-a-context", now)).toBeNull();
    expect(
      validateSignInContext(created.token, new Date(now.getTime() + 60_000)),
    ).toBeNull();
  });

  it("binds the signature to the token version", () => {
    const created = createSignInContext(classId, 2, now, 60);
    const rotated = signContext({ ...created.context, tokenVersion: 3 });
    expect(validateSignInContext(rotated, now)?.tokenVersion).toBe(3);
    expect(rotated).not.toBe(created.token);
  });

  it("uses a one-way, purpose-specific nonce hash", () => {
    const nonce = createSignInContext(classId, 1, now).context.nonce;
    expect(hashWorkflowNonce(nonce)).not.toContain(nonce);
    expect(hashWorkflowNonce(nonce)).toBe(hashWorkflowNonce(nonce));
  });

  it("returns production-safe path-scoped cookie options", () => {
    expect(signInCookieOptions(90, true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/sign-in",
      maxAge: 90,
    });
    expect(signInCookieOptions(90, false).secure).toBe(false);
  });

  it("rejects non-positive workflow lifetimes", () => {
    expect(() => createSignInContext(classId, 1, now, 0)).toThrow(/positive/i);
  });
});

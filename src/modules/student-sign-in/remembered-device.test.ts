import { describe, expect, it } from "vitest";

import {
  generateRememberedDeviceToken,
  hashRememberedDeviceToken,
  rememberedDeviceCookieOptions,
} from "./remembered-device";

describe("remembered device tokens", () => {
  it("generates 32 random URL-safe bytes and stores only a stable hash", () => {
    const first = generateRememberedDeviceToken();
    const second = generateRememberedDeviceToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(hashRememberedDeviceToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRememberedDeviceToken(first)).toBe(
      hashRememberedDeviceToken(first),
    );
    expect(hashRememberedDeviceToken(first)).not.toContain(first);
  });

  it("uses an HTTP-only sign-in-scoped cookie secure in production", () => {
    expect(rememberedDeviceCookieOptions(3600, true)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/sign-in",
      maxAge: 3600,
    });
    expect(rememberedDeviceCookieOptions(3600, false).secure).toBe(false);
  });
});

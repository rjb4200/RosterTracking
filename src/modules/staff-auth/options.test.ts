import { beforeAll, describe, expect, it, vi } from "vitest";

describe("staff session configuration", () => {
  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-secret-at-least-32-characters-long");
  });

  it("uses the one-year maximum for both the session and its JWT", async () => {
    const { authOptions, STAFF_SESSION_MAX_AGE_SECONDS } = await import(
      "./options"
    );

    expect(authOptions.session?.maxAge).toBe(STAFF_SESSION_MAX_AGE_SECONDS);
    expect(authOptions.jwt?.maxAge).toBe(STAFF_SESSION_MAX_AGE_SECONDS);
    expect(STAFF_SESSION_MAX_AGE_SECONDS).toBe(365 * 24 * 60 * 60);
  });
});

import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  PUBLIC_RATE_LIMIT_OPERATIONS,
  PUBLIC_RATE_LIMIT_POLICIES,
  rateLimitIdentifierFingerprint,
  rateLimitWindowStart,
} from "./rate-limit";

describe("public sign-in rate limits", () => {
  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-at-least-32-characters");
  });

  it("defines bounded policies for every named public operation", () => {
    expect(Object.keys(PUBLIC_RATE_LIMIT_POLICIES).sort()).toEqual(
      Object.values(PUBLIC_RATE_LIMIT_OPERATIONS).sort(),
    );
    for (const policy of Object.values(PUBLIC_RATE_LIMIT_POLICIES)) {
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.sourceAttempts).toBeGreaterThan(0);
      expect(policy.failures).toBeGreaterThan(0);
      if (policy.identifierAttempts !== undefined) {
        expect(policy.identifierAttempts).toBeGreaterThan(0);
      }
    }
  });

  it("fingerprints normalized identifiers without exposing them", () => {
    const raw = "5025550100";
    const first = rateLimitIdentifierFingerprint(
      PUBLIC_RATE_LIMIT_OPERATIONS.CURRENT_PHONE_LOOKUP,
      raw,
    );
    expect(first).toBe(
      rateLimitIdentifierFingerprint(
        PUBLIC_RATE_LIMIT_OPERATIONS.CURRENT_PHONE_LOOKUP,
        ` ${raw} `,
      ),
    );
    expect(first).not.toContain(raw);
    expect(first).not.toBe(
      rateLimitIdentifierFingerprint(
        PUBLIC_RATE_LIMIT_OPERATIONS.PRIOR_PHONE_RECOVERY,
        raw,
      ),
    );
  });

  it("places attempts into deterministic fixed windows", () => {
    expect(
      rateLimitWindowStart(
        new Date("2026-09-02T12:14:59.999Z"),
        15 * 60,
      ).toISOString(),
    ).toBe("2026-09-02T12:00:00.000Z");
    expect(
      rateLimitWindowStart(
        new Date("2026-09-02T12:15:00.000Z"),
        15 * 60,
      ).toISOString(),
    ).toBe("2026-09-02T12:15:00.000Z");
  });
});

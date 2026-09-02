import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  extractTrustedRequestMetadata,
  getTrustedRequestMetadata,
  isSameOriginRequest,
  requestSourceFingerprint,
  validateSameOriginRequest,
} from "./request-security";

describe("public request security", () => {
  beforeAll(() => {
    vi.stubEnv("AUTH_SECRET", "unit-test-auth-secret-at-least-32-characters");
  });

  it("uses the platform-overwritten client IP and Vercel correlation ID", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.4, 10.0.0.1",
      "x-vercel-id": "iad1::abc-123",
    });
    expect(extractTrustedRequestMetadata(headers)).toEqual({
      ipAddress: "203.0.113.4",
      requestCorrelationId: "iad1::abc-123",
      requestSourceFingerprint: requestSourceFingerprint("203.0.113.4"),
    });
  });

  it("uses non-sensitive fallbacks when platform headers are absent", () => {
    const metadata = extractTrustedRequestMetadata(
      new Headers(),
      "generated-correlation-id",
    );
    expect(metadata.ipAddress).toBe("unknown");
    expect(metadata.requestCorrelationId).toBe("generated-correlation-id");
    expect(metadata.requestSourceFingerprint).not.toContain("unknown");
  });

  it("requires an exact canonical origin", () => {
    expect(
      isSameOriginRequest(
        new Headers({ origin: "https://roster.example.com" }),
        "https://internal.invalid/sign-in",
        "https://roster.example.com",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Headers({ origin: "https://evil.example.com" }),
        "https://roster.example.com/sign-in",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(new Headers(), "https://roster.example.com/sign-in"),
    ).toBe(false);
  });

  it("accepts Web Request headers used by Next route handlers", async () => {
    const request = new Request("https://roster.example.com/sign-in/action", {
      method: "POST",
      headers: {
        origin: "https://roster.example.com",
        "x-forwarded-for": "198.51.100.8",
      },
    });
    expect(await getTrustedRequestMetadata(request)).toMatchObject({
      ipAddress: "198.51.100.8",
    });
    expect(await validateSameOriginRequest(request)).toBe(true);
  });
});

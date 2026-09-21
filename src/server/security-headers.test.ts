import { describe, expect, it } from "vitest";

import { securityHeaders } from "./security-headers";

function headerMap(isProduction: boolean) {
  return new Map(
    securityHeaders(isProduction).map(({ key, value }) => [key, value]),
  );
}

describe("security headers", () => {
  it("sends the documented header set in production", () => {
    const headers = headerMap(true);
    for (const key of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(headers.has(key)).toBe(true);
    }
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("locks down framing, objects, base, and form targets", () => {
    const csp = headerMap(true).get("Content-Security-Policy") ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("allows the data: images the sign-in QR code needs", () => {
    const csp = headerMap(true).get("Content-Security-Policy") ?? "";
    expect(csp).toContain("img-src 'self' data: blob:");
  });

  it("keeps the development allowances out of production", () => {
    const production = headerMap(true).get("Content-Security-Policy") ?? "";
    const development = headerMap(false).get("Content-Security-Policy") ?? "";
    expect(production).not.toContain("'unsafe-eval'");
    expect(production).not.toContain("ws:");
    expect(production).toContain("upgrade-insecure-requests");
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("ws:");
    expect(development).not.toContain("upgrade-insecure-requests");
  });

  it("sends strict transport security only in production", () => {
    expect(headerMap(true).has("Strict-Transport-Security")).toBe(true);
    expect(headerMap(false).has("Strict-Transport-Security")).toBe(false);
  });
});

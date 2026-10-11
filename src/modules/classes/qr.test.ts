import { afterEach, describe, expect, it, vi } from "vitest";

import { buildClassSignInUrl, getClassSignInBaseUrl } from "./qr";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("class sign-in URLs", () => {
  it("uses the Vercel hostname in production when the canonical origin is localhost", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "roster-tracking.vercel.app");

    expect(getClassSignInBaseUrl()).toBe("https://roster-tracking.vercel.app");
    expect(buildClassSignInUrl("1YZW")).toBe(
      "https://roster-tracking.vercel.app/1YZW",
    );
  });

  it("uses its own configured origin outside production and never the production domain", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXTAUTH_URL", "https://rosterdev.winchesterfireems.com");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "roster-tracking.vercel.app");

    expect(getClassSignInBaseUrl()).toBe(
      "https://rosterdev.winchesterfireems.com",
    );
    expect(buildClassSignInUrl("1YZW")).toBe(
      "https://rosterdev.winchesterfireems.com/1YZW",
    );
  });

  it("falls back to localhost only in development", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "roster-tracking.vercel.app");

    expect(getClassSignInBaseUrl()).toBe("http://localhost:3000");
  });
});

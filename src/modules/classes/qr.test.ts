import { afterEach, describe, expect, it, vi } from "vitest";

import { buildClassSignInUrl, getClassSignInBaseUrl } from "./qr";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("class sign-in URLs", () => {
  it("uses the Vercel hostname when production has a localhost auth origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "roster-tracking.vercel.app");

    expect(getClassSignInBaseUrl()).toBe("https://roster-tracking.vercel.app");
    expect(buildClassSignInUrl("token")).toBe(
      "https://roster-tracking.vercel.app/sign-in/token",
    );
  });
});

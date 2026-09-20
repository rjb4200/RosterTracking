import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { establishSignInContext } = vi.hoisted(() => ({
  establishSignInContext: vi.fn(),
}));

vi.mock("@/modules/student-sign-in/establish-context", () => ({
  establishSignInContext,
}));
vi.mock("@/modules/student-sign-in/request-security", () => ({
  getTrustedRequestMetadata: vi.fn(async () => ({})),
}));
vi.mock("@/server/db/client", () => ({ getDatabase: () => ({}) }));

import { GET } from "./route";

beforeEach(() => vi.clearAllMocks());

describe("sign-in context entry", () => {
  const speculativeHeaders: Record<string, string>[] = [
    { "next-router-prefetch": "1" },
    { purpose: "prefetch" },
    { "sec-purpose": "prefetch;prerender" },
  ];
  it.each(speculativeHeaders)(
    "ignores speculative requests with %j",
    async (headers) => {
      const response = await GET(
        new NextRequest("https://example.test/sign-in/establish?class=H4CX", {
          headers,
        }),
      );
      expect(response.status).toBe(204);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(establishSignInContext).not.toHaveBeenCalled();
    },
  );

  it("establishes a session for deliberate navigation without caching it", async () => {
    establishSignInContext.mockResolvedValue({
      status: "established",
      classId: "class-1",
    });
    const response = await GET(
      new NextRequest("https://example.test/sign-in/establish?class=H4CX"),
    );
    expect(establishSignInContext).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(
      "https://example.test/sign-in",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});

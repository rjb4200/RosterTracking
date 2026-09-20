import { describe, expect, it, vi } from "vitest";

const resolveOpenClassPublicCode = vi.fn();
vi.mock("@/modules/classes/services", () => ({
  resolveOpenClassPublicCode: (...args: unknown[]) =>
    resolveOpenClassPublicCode(...args),
}));

vi.mock("@/modules/student-sign-in/request-security", () => ({
  getTrustedRequestMetadata: vi.fn(async () => ({
    requestCorrelationId: "corr-1",
    requestSourceFingerprint: "fp-1",
  })),
}));

vi.mock("@/server/db/client", () => ({ getDatabase: () => ({}) }));

const { GET } = await import("./route");

function request(url: string) {
  return new Request(url) as never;
}

function params(code: string) {
  return { params: Promise.resolve({ code }) };
}

const CONTEXT = "roster_sign_in_context";

describe("class entry route", () => {
  it("hands the class code to the sign-in page without issuing a context", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: false,
    });

    const response = await GET(
      request("https://example.test/H4CX"),
      params("H4CX"),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/sign-in/establish");
    expect(location).toContain("class=H4CX");
  });

  it("does not write a sign-in context cookie on entry", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: false,
    });

    const response = await GET(
      request("https://example.test/H4CX"),
      params("H4CX"),
    );

    const contextCookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${CONTEXT}=`));
    expect(contextCookie).toBeUndefined();
  });

  it("does not clear an existing session during a speculative entry request", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: false,
    });

    const response = await GET(
      new Request("https://example.test/H4CX", {
        headers: {
          cookie: `${CONTEXT}=existing-session`,
          "next-router-prefetch": "1",
        },
      }) as never,
      params("H4CX"),
    );

    const contextCookie = response.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${CONTEXT}=`));
    expect(contextCookie).toBeUndefined();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("sends an inactive or unknown code to the generic unavailable response", async () => {
    resolveOpenClassPublicCode.mockResolvedValue(null);

    const response = await GET(
      request("https://example.test/ZZZZ"),
      params("ZZZZ"),
    );

    expect(response.headers.get("location")).toContain("status=unavailable");
  });

  it("routes a PIN-protected class to the PIN step without a context", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: true,
    });

    const response = await GET(
      request("https://example.test/H4CX"),
      params("H4CX"),
    );

    expect(response.headers.get("location")).toContain("/sign-in/pin/H4CX");
  });
});

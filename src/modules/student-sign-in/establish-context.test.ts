import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();

const cookieSet = vi.fn((name: string, value: string) => {
  cookieStore.set(name, value);
});
const cookieGet = vi.fn((name: string) => {
  const value = cookieStore.get(name);
  return value === undefined ? undefined : { name, value };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet, set: cookieSet }),
}));

const resolveOpenClassPublicCode = vi.fn();
const resolveOpenClassToken = vi.fn();
vi.mock("@/modules/classes/services", () => ({
  resolveOpenClassPublicCode: (...args: unknown[]) =>
    resolveOpenClassPublicCode(...args),
  resolveOpenClassToken: (...args: unknown[]) => resolveOpenClassToken(...args),
}));

const loadSignInWorkflow = vi.fn();
const createWorkflowFromOpenClass = vi.fn();
const createWorkflowFromClassToken = vi.fn();
vi.mock("./workflow", () => ({
  loadSignInWorkflow: (...args: unknown[]) => loadSignInWorkflow(...args),
  createWorkflowFromOpenClass: (...args: unknown[]) =>
    createWorkflowFromOpenClass(...args),
  createWorkflowFromClassToken: (...args: unknown[]) =>
    createWorkflowFromClassToken(...args),
}));

const acquirePublicRateLimit = vi.fn();
vi.mock("./rate-limit", () => ({
  acquirePublicRateLimit: (...args: unknown[]) =>
    acquirePublicRateLimit(...args),
  recordPublicRateLimitFailure: vi.fn(async () => {}),
  PUBLIC_RATE_LIMIT_OPERATIONS: {
    WORKFLOW_CREATION: "workflow_creation",
    STAGING_WRITE: "staging_write",
  },
}));

vi.mock("./identification", () => ({
  recognizeStudent: vi.fn(async () => ({ status: "recovery_or_guest" })),
  stagePendingRecognizedStudent: vi.fn((state) => state),
}));

vi.mock("./request-security", () => ({
  getTrustedRequestMetadata: vi.fn(async () => ({
    requestCorrelationId: "corr-1",
    requestSourceFingerprint: "fp-1",
  })),
}));

vi.mock("./context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./context")>();
  return {
    ...actual,
    signInCookieOptions: () => ({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/sign-in",
      maxAge: 1200,
    }),
  };
});

const { establishSignInContext } = await import("./establish-context");

const db = {} as never;
const metadata = {
  requestCorrelationId: "corr-1",
  requestSourceFingerprint: "fp-1",
} as never;

function allowAll() {
  acquirePublicRateLimit.mockResolvedValue({ allowed: true, token: "t" });
}

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
  allowAll();
});

describe("establishSignInContext", () => {
  it("rejects direct public-code access to a PIN-protected class", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: true,
    });
    expect(
      await establishSignInContext(db, { publicCode: "H4CX", metadata }),
    ).toEqual({ status: "unavailable" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("rejects direct token access to a PIN-protected class", async () => {
    resolveOpenClassToken.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: true,
    });
    expect(
      await establishSignInContext(db, { rawToken: "raw-token", metadata }),
    ).toEqual({ status: "unavailable" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("establishes a PIN-protected context after server-side verification", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
      accessPinEnabled: true,
    });
    createWorkflowFromOpenClass.mockResolvedValue({ token: "verified.token" });
    expect(
      await establishSignInContext(db, {
        publicCode: "H4CX",
        verifiedPinAccess: { id: "class-1", signInTokenVersion: 1 },
        metadata,
      }),
    ).toEqual({ status: "established", classId: "class-1" });
    expect(cookieStore.get("roster_sign_in_context")).toBe("verified.token");
  });

  it("mints a context on a first-party load and sets the cookie", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
    });
    createWorkflowFromOpenClass.mockResolvedValue({
      token: "signed.token",
      expiresAt: new Date(),
    });

    const result = await establishSignInContext(db, {
      publicCode: "H4CX",
      metadata,
    });

    expect(result).toEqual({ status: "established", classId: "class-1" });
    expect(createWorkflowFromOpenClass).toHaveBeenCalledTimes(1);
    expect(cookieSet).toHaveBeenCalledWith(
      "roster_sign_in_context",
      "signed.token",
      expect.objectContaining({ path: "/sign-in", sameSite: "lax" }),
    );
    expect(cookieStore.get("roster_sign_in_context")).toBe("signed.token");
  });

  it("reuses a valid context for the same class instead of minting", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
    });
    cookieStore.set("roster_sign_in_context", "existing.token");
    loadSignInWorkflow.mockResolvedValue({ context: { classId: "class-1" } });

    const result = await establishSignInContext(db, {
      publicCode: "H4CX",
      metadata,
    });

    expect(result).toEqual({ status: "established", classId: "class-1" });
    expect(createWorkflowFromOpenClass).not.toHaveBeenCalled();
    expect(loadSignInWorkflow).toHaveBeenCalledWith(db, "existing.token");
  });

  it("mints a fresh context when the existing one is for another class", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-2",
      signInTokenVersion: 1,
    });
    cookieStore.set("roster_sign_in_context", "other.token");
    loadSignInWorkflow.mockResolvedValue({ context: { classId: "class-1" } });
    createWorkflowFromOpenClass.mockResolvedValue({
      token: "fresh.token",
      expiresAt: new Date(),
    });

    const result = await establishSignInContext(db, {
      publicCode: "H4CX",
      metadata,
    });

    expect(result).toEqual({ status: "established", classId: "class-2" });
    expect(createWorkflowFromOpenClass).toHaveBeenCalledTimes(1);
    expect(cookieStore.get("roster_sign_in_context")).toBe("fresh.token");
  });

  it("returns unavailable when the class cannot be resolved", async () => {
    resolveOpenClassPublicCode.mockResolvedValue(null);

    const result = await establishSignInContext(db, {
      publicCode: "ZZZZ",
      metadata,
    });

    expect(result).toEqual({ status: "unavailable" });
    expect(createWorkflowFromOpenClass).not.toHaveBeenCalled();
  });

  it("returns unavailable when no class reference is present", async () => {
    const result = await establishSignInContext(db, { metadata });
    expect(result).toEqual({ status: "unavailable" });
  });

  it("returns unavailable and does not set a cookie when a limit denies", async () => {
    resolveOpenClassPublicCode.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
    });
    acquirePublicRateLimit.mockResolvedValue({ allowed: false, token: "t" });

    const result = await establishSignInContext(db, {
      publicCode: "H4CX",
      metadata,
    });

    expect(result).toEqual({ status: "unavailable" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("mints from a raw token when the visitor used a token link", async () => {
    resolveOpenClassToken.mockResolvedValue({
      id: "class-1",
      signInTokenVersion: 1,
    });
    createWorkflowFromClassToken.mockResolvedValue({
      token: "token.flow",
      expiresAt: new Date(),
    });

    const result = await establishSignInContext(db, {
      rawToken: "raw-token",
      metadata,
    });

    expect(result).toEqual({ status: "established", classId: "class-1" });
    expect(createWorkflowFromClassToken).toHaveBeenCalledWith(
      db,
      "raw-token",
      expect.anything(),
    );
  });
});

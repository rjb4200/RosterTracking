import { describe, expect, it, vi } from "vitest";

import { MissingSignInContextError, OriginRejectedError } from "./errors";
import { classifyFailure, logSignInFailure } from "./failure-log";

describe("sign-in failure logging", () => {
  it("logs only correlation, kind, class, and route", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSignInFailure({
      correlationId: "corr-1",
      failureKind: "UnhandledError",
      route: "/sign-in",
      classId: "class-1",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(payload).toEqual({
      scope: "public-sign-in",
      correlationId: "corr-1",
      failureKind: "UnhandledError",
      route: "/sign-in",
      classId: "class-1",
    });
    spy.mockRestore();
  });

  it("classifies an error without leaking its message", () => {
    const error = new TypeError("+18595551234 is not a valid phone");
    expect(classifyFailure(error)).toBe("TypeError");
    expect(classifyFailure("raw string failure")).toBe("UnknownFailure");
  });

  it("classifies a plain Error as the generic unhandled kind", () => {
    expect(classifyFailure(new Error("anything"))).toBe("UnhandledError");
  });

  it("distinguishes a rejected origin from a missing context", () => {
    const origin = classifyFailure(new OriginRejectedError());
    const context = classifyFailure(new MissingSignInContextError());
    expect(origin).toBe("OriginRejectedError");
    expect(context).toBe("MissingSignInContextError");
    expect(origin).not.toBe(context);
    expect(origin).not.toBe("UnhandledError");
    expect(context).not.toBe("UnhandledError");
  });

  it("includes value-free diagnostics when supplied", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSignInFailure({
      correlationId: "corr-2",
      failureKind: "MissingSignInContextError",
      route: "/sign-in lookupCurrentPhone",
      diagnostics: {
        host: "rosters.winchesterfireems.com",
        hasCookieHeader: true,
        cookieCount: 2,
        contextCookieCount: 0,
      },
    });
    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(payload.diagnostics).toEqual({
      host: "rosters.winchesterfireems.com",
      hasCookieHeader: true,
      cookieCount: 2,
      contextCookieCount: 0,
    });
    spy.mockRestore();
  });

  it("omits diagnostics when absent", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSignInFailure({
      correlationId: "corr-3",
      failureKind: "UnhandledError",
      route: "/sign-in",
    });
    const payload = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(payload).not.toHaveProperty("diagnostics");
    spy.mockRestore();
  });

  it("carries diagnostics on the missing-context error", () => {
    const error = new MissingSignInContextError({ cookieCount: 0 });
    expect(error.diagnostics).toEqual({ cookieCount: 0 });
    expect(new MissingSignInContextError().diagnostics).toBeUndefined();
  });
});

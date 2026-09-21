import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyServerFailure,
  correlationIdFromHeaders,
  logServerFailure,
} from "./server-failure-log";

afterEach(() => {
  vi.restoreAllMocks();
});

function emit(input: Parameters<typeof logServerFailure>[0]) {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  logServerFailure(input);
  expect(spy).toHaveBeenCalledTimes(1);
  const line = spy.mock.calls[0]?.[0];
  return JSON.parse(String(line)) as Record<string, unknown>;
}

describe("server failure log", () => {
  it("emits one JSON line carrying the kind, route, and correlation id", () => {
    expect(
      emit({
        failureKind: "UnhandledError",
        route: "/api/staff/class-roster/[classId]",
        correlationId: "req-123",
      }),
    ).toEqual({
      scope: "server",
      failureKind: "UnhandledError",
      route: "/api/staff/class-roster/[classId]",
      correlationId: "req-123",
    });
  });

  it("emits only the allowed fields, so no value can be attached", () => {
    const entry = emit({ failureKind: "UnhandledError", route: "/api/x" });
    expect(Object.keys(entry).sort()).toEqual([
      "correlationId",
      "failureKind",
      "route",
      "scope",
    ]);
  });

  it("generates a correlation id when the request supplies none", () => {
    const entry = emit({ failureKind: "UnhandledError", route: "/api/x" });
    expect(String(entry.correlationId).length).toBeGreaterThan(0);
  });

  it("classifies an error without carrying its message", () => {
    expect(classifyServerFailure(new TypeError("phone +18595551234"))).toBe(
      "TypeError",
    );
    expect(classifyServerFailure(new Error("phone +18595551234"))).toBe(
      "UnhandledError",
    );
    expect(classifyServerFailure("boom")).toBe("UnknownFailure");
  });

  it("prefers the platform request id and falls back when absent", () => {
    expect(
      correlationIdFromHeaders(new Headers({ "x-vercel-id": "abc" })),
    ).toBe("abc");
    expect(correlationIdFromHeaders(new Headers()).length).toBeGreaterThan(0);
  });
});

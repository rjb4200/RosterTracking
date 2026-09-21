import "server-only";

/**
 * Structured, sanitized logging for unexpected server failures.
 *
 * Emits one JSON line per failure so the platform's runtime logs can be read
 * and filtered by failure kind, route, and correlation id. The input shape has
 * no free-form message or detail field on purpose: there is nowhere to put a
 * phone number, credential value, token, or database error message, so a
 * personal value cannot reach a log through this path.
 */
export interface ServerFailureInput {
  failureKind: string;
  route: string;
  correlationId?: string;
}

export function logServerFailure(input: ServerFailureInput): void {
  const entry = {
    scope: "server",
    failureKind: input.failureKind,
    route: input.route,
    correlationId: input.correlationId ?? crypto.randomUUID(),
  };
  console.error(JSON.stringify(entry));
}

/**
 * A coarse category for an unknown error. Keeps the error's name only, never
 * its message, which could contain a value.
 */
export function classifyServerFailure(error: unknown): string {
  if (error instanceof Error) {
    return error.name && error.name !== "Error" ? error.name : "UnhandledError";
  }
  return "UnknownFailure";
}

/**
 * Prefer the platform request id so a report can be traced back to the request
 * that produced it; fall back to a fresh id when it is absent.
 */
export function correlationIdFromHeaders(headers: Headers): string {
  return headers.get("x-vercel-id") ?? crypto.randomUUID();
}

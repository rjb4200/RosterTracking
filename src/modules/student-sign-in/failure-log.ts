import "server-only";

import type { SignInFailureDiagnostics } from "./errors";

/**
 * Structured, sanitized failure logging for the public sign-in surface.
 *
 * Logs only a correlation id, the class id when known, a coarse failure kind,
 * and the route. Never logs phone numbers, tokens, credentials, or any other
 * personal value; callers must not pass them.
 */
export interface SignInFailureInput {
  correlationId: string;
  failureKind: string;
  route: string;
  classId?: string | null;
  diagnostics?: SignInFailureDiagnostics;
}

export function logSignInFailure(input: SignInFailureInput): void {
  const entry = {
    scope: "public-sign-in",
    correlationId: input.correlationId,
    failureKind: input.failureKind,
    route: input.route,
    classId: input.classId ?? null,
    ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
  };
  console.error(JSON.stringify(entry));
}

/**
 * Coarse classification of an unknown error without leaking its message, which
 * could contain values. Keeps only a safe category name.
 */
export function classifyFailure(error: unknown): string {
  if (error instanceof Error) {
    return error.name && error.name !== "Error" ? error.name : "UnhandledError";
  }
  return "UnknownFailure";
}

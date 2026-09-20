import "server-only";

/**
 * Value-free request diagnostics attached to a missing-context failure.
 *
 * Records only the shape of the request: the host, whether any cookie header
 * was present, how many cookies it carried, and how many times the sign-in
 * context cookie name appeared. It never records a cookie value, a phone
 * number, or any other personal value.
 */
export interface SignInFailureDiagnostics {
  host?: string;
  hasCookieHeader?: boolean;
  cookieCount?: number;
  contextCookieCount?: number;
}

/**
 * Distinct, non-sensitive failure types for the public sign-in request context.
 *
 * Both conditions previously surfaced as a plain `Error`, which the failure log
 * recorded as a generic `UnhandledError`. The type name is what the log keeps,
 * so an operator can tell the two apart from a single log line without any
 * request value being recorded.
 */
export class OriginRejectedError extends Error {
  constructor() {
    super("Mutation request origin is unavailable.");
    this.name = "OriginRejectedError";
  }
}

export class MissingSignInContextError extends Error {
  readonly diagnostics?: SignInFailureDiagnostics;

  constructor(diagnostics?: SignInFailureDiagnostics) {
    super("Sign-in context is unavailable.");
    this.name = "MissingSignInContextError";
    this.diagnostics = diagnostics;
  }
}

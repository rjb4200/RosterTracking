import "server-only";

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
  constructor() {
    super("Sign-in context is unavailable.");
    this.name = "MissingSignInContextError";
  }
}

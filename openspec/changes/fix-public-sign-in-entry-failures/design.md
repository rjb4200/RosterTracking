## Context

See `proposal.md` — Why. `requestContext()` in `src/app/sign-in/actions.ts` throws two distinct plain `Error`s before it can return metadata, and `classifyFailure` maps any plain `Error` to `"UnhandledError"`. The log therefore cannot distinguish them. Separately, `isSameOriginRequest` compares against exactly one origin, so the project's `*.vercel.app` hostname is rejected although the app serves it.

Verified against production: `NEXTAUTH_URL` is exactly `https://rosters.winchesterfireems.com`, key health is green, and the deployed commit is current. The failing request is `POST /sign-in` with `failureKind: "UnhandledError"`, `correlationId: "unknown"`, `classId: null`.

## Goals / Non-Goals

**Goals:**
- One log line names the cause of a public sign-in entry failure.
- A request on a host the app legitimately serves is accepted.
- Student-visible behavior is unchanged.

**Non-Goals:**
- Logging error messages or any request value.
- Wildcard or suffix host matching.
- Changing the success path.

## Decisions

### D1 — Distinct error types, not logged messages

Introduce `OriginRejectedError` and `MissingSignInContextError`, both extending `Error` with an explicit `name`. `classifyFailure` already prefers `error.name`, so the log gains the cause with no change to the logger and no message content exposed. Logging the message was rejected: the existing contract promises no personal values in logs, and keeping messages out of the log preserves it without loss.

### D2 — Bounded origin allowlist

`isSameOriginRequest` accepts an origin that strictly equals any of:

1. the configured canonical origin (`NEXTAUTH_URL`),
2. the request's own origin,
3. the deployment project production domain (`VERCEL_PROJECT_PRODUCTION_URL`).

Hosts are compared by full URL origin, so scheme and port must match. A missing origin header still returns false. Suffix or wildcard matching was rejected because it would accept attacker-controlled lookalike domains; a fixed set of known hosts is the intended trust boundary.

### D3 — Keep the student response identical

Both failures still funnel to the generic unavailable response. Only the operator-visible classification diverges.

## Risks / Trade-offs

- [Allowlisting the request origin could accept a spoofed host behind a proxy] → The allowlist checks full origin equality, not a prefix, and the request-origin entry exists so a deployment on a legitimate alternate host still works; the configured canonical origin remains first in precedence.
- [New error names could collide with future ones] → Names are specific and prefixed by intent (`OriginRejectedError`, `MissingSignInContextError`).
- [Diagnostics improve but the sign-in failure may persist] → Intended: this change makes the cause visible so the correct follow-up fix can be chosen rather than guessed.

## Migration Plan

1. Add the two error types and use them in `requestContext()`.
2. Widen `isSameOriginRequest` to the allowlist.
3. Add unit tests for each classification and each origin case.
4. Deploy, retry the failing flow, and read the `failureKind` to confirm the cause.
5. Roll back by reverting application code; no schema change.

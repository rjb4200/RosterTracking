## Why

Production student sign-in fails on the form POST with a single opaque log line — `{"failureKind":"UnhandledError","correlationId":"unknown","classId":null}` — that is identical for two unrelated causes: a rejected request origin and a missing sign-in context cookie. The origin check also accepts exactly one configured origin, so the project's own `*.vercel.app` hostname is rejected outright even though the app serves it.

## What Changes

- Give the two indistinguishable failures in the public sign-in request context distinct, non-sensitive `failureKind` values so an operator can resolve the cause from one log line.
- Accept a bounded allowlist of trusted origins on public sign-in mutations: the configured canonical origin, the request's own origin, and the Vercel project production domain, instead of a single exact match.
- Keep failing closed when no origin is trusted, and keep the student-facing response identical for every failure.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `public-sign-in-reliability`: sign-in failures must be diagnosable by cause, and same-origin validation must accept the hosts the application is legitimately served on rather than a single exact origin.

## Impact

- Modules: `student-sign-in/request-security.ts` (origin validation), `student-sign-in/failure-log.ts` (classification), `app/sign-in/actions.ts` (request context errors).
- Behavior: student-visible responses are unchanged; only operator-visible diagnostics and origin acceptance widen.
- Security: the allowlist remains a strict equality check against known hosts; no wildcard hosts and no scheme or port relaxation.

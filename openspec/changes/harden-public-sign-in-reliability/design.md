## Context

See `proposal.md` — Why. There are no `error.tsx` files anywhere in `src/app`. Public actions wrap failures in an empty `catch` and redirect to a notice, and no log is emitted. `submitAccessPin` and both public entry routes call services without a guard. The local credential key currently cannot decrypt the stored class PIN or any finalization snapshot, which silently disables PIN entry.

## Goals / Non-Goals

**Goals:**
- No unexplained framework error pages on the public sign-in surface.
- A log line that lets an operator trace a failure by correlation id.
- A key-health signal that distinguishes a configuration fault from a data fault.

**Non-Goals:**
- Fixing the specific rotated-key data (tracked separately).
- Adding an external error-monitoring dependency; start with structured server logs.
- Changing any success-path sign-in behavior.

## Decisions

### D1 — Error boundaries at the route-tree level

Add `error.tsx` for `/sign-in` (covering its nested routes) and for the staff protected tree. Boundaries render a generic message plus a retry link and never echo error details.

### D2 — Guard every public write and entry route

Wrap `submitAccessPin`, the public actions, and both entry routes in the same try/catch shape that records a sanitized log entry and redirects to the generic unavailable response. Unknown tokens and internal failures remain indistinguishable to the caller.

### D3 — Structured failure logging with correlation ids

Reuse the existing `requestCorrelationId` from request metadata. Log `{ correlationId, classId?, failureKind, route }` and nothing else. The existing audit sanitizer already drops forbidden keys; extend it to reject phone-like and credential-like values.

### D4 — Key-health check

Add a check that encrypts a fixed probe string and decrypts it with the configured key, and additionally attempts to decrypt the stored class PIN when an open class exists. Report health through a small internal route and a startup warning. Alternatives: log-only (no operator signal), or fail fast at boot (too disruptive for a recoverable configuration fault).

## Risks / Trade-offs

- [Generic responses can hide real regressions] → The correlation-id log entry is the escape hatch; alert on failure volume.
- [Key-health needs a deterministic probe] → Use a fixed plaintext so the check is repeatable across instances.
- [Error boundaries do not catch Server Action throws] → Actions are guarded individually; boundaries cover render-time failures.

## Migration Plan

1. Add error boundaries.
2. Guard the PIN action and entry routes.
3. Add structured failure logging and sanitizer extension.
4. Add the key-health check and surface it operationally.
5. Roll back by reverting application code; no schema change.

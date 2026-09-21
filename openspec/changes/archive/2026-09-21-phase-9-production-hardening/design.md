## Context

See `proposal.md` - Why. The constraints that shape the approach:

- `next.config.ts` sets only `poweredByHeader: false`. There is no `middleware.ts`, and no security header is configured anywhere in the repository.
- `package.json` carries no monitoring or error-reporting dependency.
- `docs/verification.md` already documents the command ladder, the two isolated test databases, the reset behavior, the production guard, and a "Known issues" section — which is where #13 came from.
- `public-sign-in-reliability` already requires contained failures, generic public responses, and correlated logging that excludes personal values, so the logging hygiene this change relies on is specified rather than new.
- `application-foundation` already requires automated quality checks and a maintained roadmap.
- Neon is configured with a daily snapshot at 06:00 and 30-day retention, plus manual pre-operation snapshots (`before-e2e-wipe`, `pre-clean-class-data`, `pre-host-agency-migration`). No restore has been recorded.
- `docs/roadmap.md` stops at Phase 8. Defects #12 and #13 are already-filed findings.

## Goals / Non-Goals

**Goals:**
- Produce the epic's evidence: a findings log, a recovery runbook, a recorded restore drill, and a roadmap section.
- Harden the two genuinely missing platform pieces: response headers and production failure reporting.
- Keep review and repair separate, so severity is decided once and deliberately.

**Non-Goals:**
- The UX redesign program (#14–#33).
- Rewriting the verification ladder, rate limiting, or the audit log — these are reviewed, not replaced.
- Automating visual approval of the official roster PDFs.
- Changing any roster, attendance, finalization, or reporting behavior.

## Decisions

**Findings first, fixes second.**
The review produces a severity-tagged log; repairs follow triage. *Alternative considered:* fix as you find — rejected because it hides severity and scope, and makes "explicitly accepted" impossible to record honestly.

**Spec deltas cover only known behavior; findings become their own changes.**
Only the missing platform pieces are known today. Everything else the reviews surface is unknown, so specifying it now would be inventing requirements. *Alternative considered:* a spec per review area up front — rejected as speculative.

**Findings live in the issue tracker, with a summary document for the epic.**
#12 and #13 already are findings; copying them into a document would create two sources of truth. The tracker carries severity and state; the document carries the epic summary and the rationale for accepted findings. *Alternative considered:* a standalone findings log as the only home — rejected because it drifts from the tracker.

**Configure headers rather than add middleware, unless the policy must vary per request.**
A static header set belongs in `next.config.ts` `headers()`. *Alternative considered:* middleware for everything — rejected as runtime cost for a policy that does not vary by route.

**Attach reporting where containment already happens.**
`public-sign-in-reliability` already requires contained failures with correlated logging, so reporting hooks in at those points rather than through a new global wrapper. *Alternative considered:* a global interception layer — rejected as duplicating containment that already exists.

**Report through Vercel runtime logs rather than adding a monitoring dependency.**
The deployment already captures stdout and stderr as queryable runtime logs, so failures reach a destination without a new dependency, account, or data path. *Alternative considered:* Sentry — rejected for now because it adds a third-party data path and a DSN to manage for a single-department application. A drain can be added later without changing the logger.

**Prove recovery with a drill into a scratch branch, never against production.**
Restore a snapshot onto a new branch, verify it, then discard it — the same discipline the test-database scripts already enforce with their production guard.

## Risks / Trade-offs

- **A content security policy can break the application.** → Exercise the policy against the real journeys (staff sign-in, class page, public student sign-in) before calling it done; the spec makes that a requirement rather than a hope.
- **A log-only destination is only as useful as what is written to it.** → The spec requires the failure kind, the route, and a correlation identifier, and `public-sign-in-reliability` already establishes the rule that personal values are excluded, so the structured logger is the single place that has to be right.
- **A restore drill consumes a scratch branch and compute.** → Restore onto a branch without compute, or delete it as soon as the drill is verified.
- **Findings-first can stall if triage is unbounded.** → The rule is explicit: critical and high are fixed or accepted within this change; everything else becomes a traceable deferred issue.
- **The review can surface more than the epic can absorb.** → The UX program is recorded as out of scope in the proposal, so findings are triaged against this change instead of silently widening it.
- **Staff visual approval is a human gate that can block the PDF workstream indefinitely.** → Treat PDF verification as a recorded review outcome with an explicit approval state, not as a prerequisite for the hardening work.

## Migration Plan

Additive. No schema change and no migration. Headers and reporting deploy with the application; the runbook and drill record are documentation. Rollback reverts the commit, and either platform change is independently revertible with no data impact.

## Open Questions

- Whether the accessibility review is a full audit or scoped to the staff workflows the department actually uses. This changes the size of one review task, not the specs or the approach.

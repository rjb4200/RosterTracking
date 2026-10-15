## Context

Staff have no in-app way to report a problem. The app already calls an external provider from the server (`notifications/client.ts` `sendEmail` reads `RESEND_API_KEY`, `fetch`es the provider, and throws a non-leaking error when unconfigured), and it deliberately keeps free-form text out of its logs (`server-failure-log.ts`). The repository `rjb4200/RosterTracking` is **public**, so any issue filed there is world-readable. Staff error boundaries already exist at `staff/(protected)/error.tsx`, `sign-in/error.tsx`, and `[code]/error.tsx`.

## Goals / Non-Goals

**Goals:**
- Let a staff member file a GitHub issue from inside the app, with the context that makes it actionable.
- Keep the token server-only and degrade cleanly when it is absent.
- Keep student personal data out of a public issue.

**Non-Goals:**
- Student/public reporting (staff-only).
- Rate limiting (staff-only; revisit if abuse appears).
- Attaching screenshots or the raw error message.
- Any database schema change.

## Decisions

**D1 — Create the issue through the GitHub API, not a deep link.** A server action calls `POST /repos/{owner}/{repo}/issues`. Chosen over a prefilled "new issue" link (which needs no secret) because the request is to *directly* add the issue without the reporter needing a GitHub account or a manual submit.

**D2 — A server-only GitHub client mirroring `sendEmail`.** The client reads `GITHUB_ISSUE_TOKEN`, calls the API, and throws a plain, non-leaking error when unconfigured or rejected; the token is never sent to the client and never appears in an error message. The token is a fine-grained PAT with `Issues: write` on the target repository.

**D3 — Target the application's own (public) repository.** Simplest, and staff see the report where the code lives. Because the repo is public the issue is world-readable, so the form warns against student personal data (D5) and the body is mostly structured context (D6). A private tracker repository is the fallback if reporting later opens to students.

**D4 — Staff-only, from the authenticated staff shell.** The affordance lives in the staff header and the staff error boundary. Public screens offer nothing, which keeps reporting accountable and low-abuse.

**D5 — A short form: category, subject, description.** Category is a fixed set (Bug, Feature request, Question), defaulting to Bug, and maps to a label. The form carries a visible warning not to include student names, phone numbers, or credentials.

**D6 — Auto-captured context in the body.** Route, environment, staff username and role, timestamp, correlation id (when present), user agent, and the class id when the page is a class page. Structured context reduces reliance on free text and speeds triage.

**D7 — Degrade when unconfigured.** The UI gates on a non-secret, build-time flag (`NEXT_PUBLIC_ISSUE_REPORTING=1`) so both the server-rendered header and the client error boundary can decide whether to offer the affordance; the server action separately requires `GITHUB_ISSUE_TOKEN` and refuses when it is absent. When the flag is off the affordance is not offered; when the token is absent a submit is refused. The client error boundary cannot read the server-only token, which is why the gate is a separate public flag rather than the token itself.

**D8 — No rate limit (deliberate).** Staff-only and trusted; a per-staff cap is omitted by decision and revisited if abuse appears.

**D9 — Two entry points.** A header link, and a "Report this problem" action on the staff error boundary. The error-boundary action attaches the correlation id rather than the raw error message, to avoid leaking values.

## Risks / Trade-offs

- [A public issue leaks pasted student data] → In-form warning, staff-only access, and a mostly structured body; move to a private tracker if reporting opens up.
- [Token leakage] → Server-only client; token never reaches the client or an error string.
- [GitHub API failure or rate limiting] → Surface a non-leaking error the reporter can retry; optionally record the failure with `logServerFailure`.
- [Category set drifts from labels] → Keep one mapping from category to label in code.
- [No rate limit] → Accepted; staff-only scope bounds the blast radius.

## Migration Plan

1. Add `GITHUB_ISSUE_TOKEN` to the environments that should offer reporting (Vercel Production/Preview); never to a client-exposed variable.
2. Ship the client, action, and UI. Rollback is removing the affordance; no data migration.
3. When the token is absent, nothing is offered, so the change is inert without configuration.

## Open Questions

- Exact label names ("user-report" plus the category labels)?
- Should the created issue assign or notify anyone? Default: no.

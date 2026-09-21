# Phase 9 hardening findings

Findings from the production-hardening review (issue #2). Each finding carries a
severity, the review area it came from, the evidence, and a disposition.

Dispositions: **fixed** (resolved in this cycle), **accepted** (knowingly left,
with a rationale), **deferred** (tracked as follow-up work).

## Review status

| Area | How it was reviewed |
| --- | --- |
| Filed defects | Read and confirmed against the code |
| Error handling | Code level: route-tree containment and degradation paths |
| Security | Code level: headers, rate limits, logging hygiene, auth boundaries |
| Accessibility | `@axe-core/playwright` over the landing, sign-in, staff login, and workspace pages |
| Mobile and tablet | The `mobile-chrome` project across the whole suite |
| Browser compatibility | Firefox and WebKit projects added and run |
| Performance | Navigation timing for the landing, sign-in, workspace, and class list, against a production build |
| Operational recovery | A restore drill from the most recent daily snapshot, with row counts compared against production |

## Findings

| ID | Area | Severity | Finding | Disposition |
| --- | --- | --- | --- | --- |
| H-1 | Security | High | Every response shipped with no security headers. | **Fixed** — `harden-production-responses`. |
| H-2 | Reporting | High | A re-finalized class looks like first-time reporting work, risking duplicate agency submission (#12). | **Accepted** — split into `reporting-queue-supersession`, tracked as #35. |
| H-3 | Mobile | Medium | The class creation wizard's action row overlaps step content on narrow viewports, so **Next** cannot be clicked (#13). | **Deferred** — #13. |
| H-4 | Security | Medium | Staff authentication has no per-IP rate limiting; lockout is per account only. | **Deferred** — #36. |
| H-5 | Audit | Medium | Failed staff logins are not audited; only successes are. | **Deferred** — #37. |
| H-6 | Error handling | Medium | No error boundary covers the root or the login segments. | **Deferred** — #38. |
| H-7 | Error handling | Medium | Staff API routes logged raw error objects rather than sanitized entries. | **Fixed** — structured `logServerFailure`. |
| H-8 | Accessibility | Serious | Colour contrast fails on `/staff/login` (`.eyebrow`) and `/staff` (`.staff-user`, nav links). | **Deferred** — #39. |
| H-9 | Mobile | Medium | The mutating staff workflows are not covered on a mobile viewport; the specs are gated to Chromium because of H-3. | **Deferred** — same root cause as #13. |
| H-10 | Browser compatibility | Low | The first Tab stop on the landing page differs between browsers; it reaches the primary action in Chromium only. | **Accepted** — a focus-order difference, not a defect. The assertion is scoped to Chromium. |
| H-11 | Browser compatibility | Low–Medium | The landing page overflows horizontally by 24px in Firefox, giving a horizontal scrollbar. | **Deferred** — #40. |
| H-12 | Operational recovery | High | Production records 8 applied migrations against 14 in the repository. Five were applied out of band so the ledger disagrees with reality, and `0013` genuinely is not applied. Running the migrator would fail on an already-existing table and never reach `0013`. | **Deferred** — documented in `docs/operations.md`; needs the ledger reconciled before any future migration can ship. |
| H-13 | Operational recovery | Medium | `restore_snapshot` defaults to `finalize: true`, which reassigns the production compute and swaps branch names — so a "non-destructive" drill silently replaces production. It did so during the 2026-09-21 drill. No data was lost. | **Mitigated** — the runbook now requires `finalize: false` for a drill, and the incident is recorded. |

## What was verified as sound

- **Public sign-in failure handling.** `failure-log.ts` logs only a correlation
  id, class id, coarse failure kind, and route, and strips the error message.
- **Staff credential verification.** Unknown usernames and malformed input both
  verify a dummy Argon2 hash, so timing does not reveal whether an account
  exists. Lockout triggers after five failures for fifteen minutes.
- **Accessibility of the public surface.** The landing page and the public
  sign-in entry report no critical or serious axe violations.
- **Performance.** The landing page, sign-in entry, workspace, and class list all
  load well inside a generous budget on a production build. No finding.
- **Test-database isolation.** The integration and end-to-end suites use separate
  databases prepared from committed migrations, and the reset script refuses to
  target the production database.

## Accepted risks

### H-2 — duplicate reporting after a re-finalization

Accepted for this cycle rather than fixed, on the grounds that:

- It requires a deliberate sequence — reopen with a reason, edit the roster, and
  re-finalize — so it cannot occur on a class nobody touched.
- The fix is fully planned in `reporting-queue-supersession` and tracked as #35,
  so the acceptance is a deferral with a destination, not a drop.
- Until it ships, a Training Major has no in-product signal and must be told
  which classes were re-finalized.

**This is the finding I would prioritise first.** It is the only one whose
failure mode is a wrong submission to an external agency.

### H-10 — first Tab stop differs by browser

Accepted because it is a difference in browser focus behaviour rather than a
defect: the primary action is reachable and focusable in all three engines, it
is simply not the first Tab stop outside Chromium. The assertion in
`foundation.spec.ts` is scoped to Chromium, and the spec text records why.

## Notes

- H-1 was split out and shipped as `harden-production-responses`; it is recorded
  here so the epic has one findings list.
- Two test assertions are deliberately narrowed with a pointer to a finding:
  the accessibility allowlist for H-8, and the Firefox exclusion for H-11. Each
  says in place how to remove it. A new violation id still fails the
  accessibility spec.
- Every deferred finding is a filed issue, so nothing here is dropped.

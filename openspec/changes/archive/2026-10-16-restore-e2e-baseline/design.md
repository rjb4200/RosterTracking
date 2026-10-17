## Context

The Playwright browser suite is red on the committed baseline (`4166570`, and identically on `ab22934`). Applying `add-training-categories` surfaced 10 failing tests across 8 specs; `instructor-roster` is additionally order-dependent. The red has been invisible because `npm run verify` excludes the browser suite (only `verify:full`, run manually before pushing, includes it) and `docs/verification.md` still says "Known issues: None".

Each failure was reproduced locally. They fall into four families that need different fixes:

| Family | Specs | Observed failure | Layer to fix |
| --- | --- | --- | --- |
| A. Ambiguous accessible names | `fire-roster-fields` (x2), `search-select-autoselect` (x1) | `getByLabel("Category")` matches both the `"Filter Category"` searchbox and the `"Category *"` select (strict-mode violation); exact `"Category"` no longer exists | Product label + tests |
| B. FFN normalization drift | `instructor-profiles` (x2), `student-sign-in` (x2) | input canonicalizes `12345678`→`1234-5678` (test expects raw); tests feed 6-digit values the validator rejects; `.account-profile` selector renders 0 | Tests |
| C. Collapsed disclosure | `reporting-destinations` (x1) | MTU free-text fields now inside `<details><summary>Additional details</summary>`, hidden from `fill` | Tests |
| D. Runtime | `cross-site-sign-in` (x1), `live-roster` (x1) | Next.js "Invalid Server Actions request" on cross-site arrival; roster reaches a new sign-in via a full navigation | Investigate → product or harness |
| E. Flake | `instructor-roster` (flaky) | passes alone, fails under parallel run against the shared staff account | Test isolation |

Constraints: the integration/unit suites are green; `instructor-roster` passed in a 6-spec batch, confirming it is interference, not logic. The repo runs Next.js 16.3.3 (`next dev` by default in the suite), and the project warns this Next version differs from prior training knowledge.

## Baseline capture (tasks 1.1–1.2)

Command: `npx playwright test --project chromium --workers=2`. Result: **10 failed / 9 skipped / 69 passed**. The failing set matches the initial report exactly, and no additional spec was hidden.

| # | Spec:line | Family | Layer to fix |
| --- | --- | --- | --- |
| 1 | `fire-roster-fields.spec.ts:54` | A — ambiguous name | product label + test |
| 2 | `fire-roster-fields.spec.ts:93` | A — ambiguous name | product label + test |
| 3 | `search-select-autoselect.spec.ts:10` | A — ambiguous name | product label + test |
| 4 | `reporting-destinations.spec.ts:10` | C — collapsed disclosure | test |
| 5 | `instructor-profiles.spec.ts:20` | B — FFN normalization | test |
| 6 | `instructor-profiles.spec.ts:43` | B — account selector | test |
| 7 | `student-sign-in.spec.ts:260` | B — FFN format | test |
| 8 | `student-sign-in.spec.ts:327` | B — FFN format | test |
| 9 | `cross-site-sign-in.spec.ts:60` | D — runtime | investigate |
| 10 | `live-roster.spec.ts:93` | D — runtime | investigate |

`instructor-roster.spec.ts` is not in the failing set on this run (it passes alone) — family E, flaky.

An earlier attempt ran both `chromium` and `mobile-chrome` with 5 workers; the `next dev` server died partway and produced ~90 cascading `ERR_CONNECTION_REFUSED` failures. That run is discarded as environmental, not product. Chromium-only with 2 workers is stable.

### Post-implementation findings

- The baseline had moved by the time implementation ran: `HEAD` was `f2d58c1` (two training-category commits past `4166570`). The reds were unchanged.
- Family D resolved with **no product change**: `cross-site-sign-in` needed an email on its fixture student (the dev-only "Invalid Server Actions request" was transient); `live-roster` counted same-document history navigations, so its detector moved to the `load` event.
- Family A also surfaced that the E2E operator needs an FFN to create a Fire class; `fire-roster-fields` sets one in its fixture.
- Two further checks are load-sensitive and pre-existing (not in the initial report): `accessibility.spec.ts:45` (axe `color-contrast` on the empty public landing page) and `performance.spec.ts:51` (`/staff` TTFB tripwire). Both pass in isolation and under `E2E_PRODUCTION=1`; they are recorded in `docs/verification.md`.
- The E2E database accumulates open classes across runs; the public directory's `.limit(100)` then hides a fixture's class. The documented gate resets first, which also reveals that `db:reset:e2e` removes the E2E staff accounts — both are recorded in `docs/verification.md`.

## Goals / Non-Goals

**Goals:**

- Every failing spec is green on the baseline, and the fix is applied at the correct layer (stale test vs product defect vs regression).
- The suite is deterministic: no spec depends on run order or another spec's side effects.
- `docs/verification.md` reflects the true suite status, and the documented pre-push gate covers the browser suite.

**Non-Goals:**

- Broad refactors of the wizard, MTU fields, or sign-in flows beyond what a confirmed regression requires.
- Changing the FFN format or `isValidFfn` semantics (the `credentials` and `instructor-profiles` specs already define normalization correctly).
- Adding new test frameworks or moving the suite off Playwright.

## Decisions

### 1. Triage first, fix by layer

Determine the exact failure for every spec (reproduce, capture the error) and classify it as stale-test, a11y defect, or regression before editing anything.

**Why over "just update the selectors":** blanket selector edits would silently paper over families D, which may be real regressions. Layer-correct fixes keep the suite a real signal.

### 2. Accessible names: strip the glyph, expose required state properly

Give the filter and value inputs of a searchable catalog control distinct accessible names and remove the required-marker glyph (`*`) from the value control's name; carry required state with `aria-required`/`required`.

**Alternative considered:** keep `"Category *"` and update tests to use `{ exact: true }` and scoped locators. Rejected: it leaves the a11y defect (screen readers announce "Category star") and keeps the name brittle for future specs. Fixing the name is a superset that also heals family A.

### 3. FFN: correct the tests, change nothing in the product

The specs already require normalization (`12345678` → `1234-5678`) and rejection of what cannot normalize. The failing tests either assert the pre-normalization value or supply values that legitimately cannot normalize (6 digits). Update the tests; leave `normalizeFfn`/`isValidFfn` alone.

**Alternative considered:** relax validation to accept shortcuts. Rejected: contradicts the `credentials` and `instructor-profiles` requirements.

### 4. MTU `<details>`: expand the disclosure in the test

Keep the "Additional details" disclosure (it is a deliberate 3635d29 restructure) and have the spec expand `<summary>` before filling the free-text fields. Also update the stale label selector (`Mileage` → the current label).

### 5. Family D: disambiguate with production semantics before changing code

Reproduce `cross-site-sign-in` and `live-roster` with `E2E_PRODUCTION=1` (the docs state production mode is required for cookie, prefetch, and caching semantics).

- If the failure persists in production → it is a real regression against existing requirements in `public-sign-in-reliability` and `live-class-command-screen`; fix the product code (no spec delta needed, the requirements are unchanged).
- If it disappears in production → it is a dev-mode artifact; correct the harness (run the affected specs under production semantics) and/or the test, and record why.

**Why:** these two are security- and behavior-adjacent; a product fix must be justified by a production reproduction, not a dev-server artifact. This is the one place where a wrong call has real cost.

### 6. Flake: isolate or make `instructor-roster` load-tolerant

**Finding (plan revised).** The hypothesis was a shared-resource race on the global `E2E_STAFF_USERNAME` account. Investigation found none: staff login does **not** bump `sessionVersion` (only `invalidateUserSessions` does), there is no successful-login rate limiter (only a failed-attempt lockout), and the spec's fixtures are row-scoped. The spec also could not be reproduced failing in isolation (`--repeat-each 3 --workers 4` → 6 passed).

**Decision.** Treat it as load/timeout sensitivity in the heavy review→correct→finalize→reopen journey under the parallel suite, and adopt the repository's existing precedent: `class-creation.spec.ts` raises its timeout to 120s for a comparable journey. `instructor-roster.spec.ts` now does the same. Re-confirmed passing alone and under load.

### 7. Docs and gate

Update `docs/verification.md` "Known issues" to the true state after the fixes, and confirm the documented pre-push command (`verify:full`) runs the browser suite.

## Risks / Trade-offs

- **[Family D is a Next 16 dev artifact, not a regression]** → Mitigation: gate any product fix on a `E2E_PRODUCTION=1` reproduction; otherwise fix the harness and document the reason.
- **[Accessible-name change ripples to other specs or screens]** → Mitigation: the change lives in the shared searchable-catalog control; run the full suite (not just the two family-A specs) after the edit.
- **[Flake is environmental, not isolation]** → Mitigation: reproduce with repeated and randomized-order runs; if the shared end-to-end database is the cause, address fixture isolation rather than sprinkling retries.
- **[Triage finds more failures than the 8 specs]** → Mitigation: the first task is a full-suite baseline capture, so the true set is known before fixing.
- **[`docs/verification.md` drifts again]** → Mitigation: record a "no known failures" claim only after a clean full run, and treat any re-red as a change-level failure.

## Migration Plan

No schema, migration, or database-API changes. The change touches `tests/e2e/`, at most one or two application components, and `docs/verification.md`. Rollback is a revert; there is no data or runtime migration.

## Open Questions

- Is the cross-site "Invalid Server Actions request" a real regression or Next 16 dev-mode origin behavior? (Resolved by the production-mode reproduction.)
- Is the live-roster full navigation a regression, or a dev-mode error-overlay reload triggered by a server error elsewhere?
- Does the searchable-catalog control's accessible name live in one shared component (fixing wizard and catalog screens together), or per screen?

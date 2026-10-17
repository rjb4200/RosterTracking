## 1. Baseline capture and triage

- [x] 1.1 Ran the browser suite (`--project chromium`) against the committed baseline and captured every failing spec (10 failed / 69 passed). Did **not** run `db:reset:e2e`: it truncates all `public` tables and recreates only the `reference-import` actor, wiping the E2E staff/instructor/elevated accounts the suite depends on, and the existing E2E database already reflects the committed baseline.
- [x] 1.2 Recorded each failure by family and layer — see "Baseline capture" in `design.md`. The set matches the reported one exactly; no additional specs were hidden. A first attempt with 5 workers and both projects crashed the dev server (cascading `ERR_CONNECTION_REFUSED`); re-running chromium-only with 2 workers was clean.
- [x] 1.3 Confirmed green: unit `388 passed`, integration `118 passed` (30 files). The change stays scoped to the browser suite.

## 2. Accessible names (Family A) — class-creation-wizard

- [x] 2.1 `search-select.tsx` now gives the value `<select>` an explicit `aria-label={label}`, distinct from the filter's `Filter <label>`.
- [x] 2.2 The value control's accessible name is now exactly the label (no `*` glyph); required state is carried by the native `required` attribute. The visual `*` stays for sighted users.
- [x] 2.3 `search-select-autoselect.spec.ts` already queried `getByLabel("Category", { exact: true })`; the product fix makes that exact name resolve (previously it was `"Category *"`). Also made its filter term unique (`suffix` token) because seeded catalog titles contain "hose".
- [x] 2.4 `fire-roster-fields.spec.ts` (both Fire-subject tests) now uses `getByLabel("Category", { exact: true })`. Also added a `setLeadInstructorFfn` fixture: a Fire class requires the lead instructor (the creator) to hold a valid FFN, which the class-shape previously masked.
- [x] 2.5 Ran `fire-roster-fields`, `search-select-autoselect`, `class-wizard-required`, `class-wizard-course-number`, `class-wizard-mtu-mileage`, `class-creation`, `curriculum-chapters`, `curriculum-not-listed` — **20 passed**, so no other spec relied on the old name.

## 3. FFN normalization and account selector (Family B) — tests only

- [x] 3.1 `randomFfn()` in `instructor-profiles.spec.ts` now returns the canonical `0000-0000` form the input stores and redisplays.
- [x] 3.2 `instructor-profiles.spec.ts` account journey now searches the `/staff/accounts` table for the admin's row, opens the per-account page, and edits the profile there (the old inline `.account-profile` block is gone).
- [x] 3.3 `student-sign-in.spec.ts` now uses a canonical `0000-0000` FFN (via a new `randomFfn()`) in both the "update my information" and "unknown phone registers" tests.
- [x] 3.4 Confirmed no product change is needed: the `credentials` and `instructor-profiles` specs require `0000-0000` normalization, and `normalizeFfn` already accepts 8 digits. `normalizeFfn`/`isValidFfn` are unchanged.

## 4. MTU collapsed disclosure (Family C) — tests only

- [x] 4.1 `reporting-destinations.spec.ts` now expands the "Additional details" disclosure before filling the MTU free-text fields. Also fixed two newly-exposed stale assertions it had been masking: the required `Class name` label query (glyph-free name does not exist) and the ambiguous `"Mobile Training Unit"` review text.
- [x] 4.2 Updated the legacy mileage locator to the current label `Other / legacy mileage (unattributed)`.

## 5. Runtime failures (Family D) — investigate, then fix the correct layer

- [x] 5.1 Reproduced both under `E2E_PRODUCTION=1` (build + serve): `cross-site-sign-in:60` still failed (later, at the email step); `live-roster:93` **passed**. Recorded in `design.md`.
- [x] 5.2 Decision per failure: neither is a product regression. Cross-site = a dev-only transient (`Invalid Server Actions request`) plus a fixture gap (the cross-site student had no email); both tests pass in dev after the fix. live-roster = the test counted same-document history navigations, not reloads.
- [x] 5.3 Not applicable — no cross-site regression confirmed. Added an email to the cross-site fixture student; both `cross-site-sign-in` tests pass in dev and prod. No product change.
- [x] 5.4 Not applicable — no roster-refresh regression confirmed. The dev-mode extra `framenavigated` is a same-document history change (`DEBUG LOAD` never fired). No product change.
- [x] 5.5 Tightened the live-roster assertion to detect an actual reload (`load` event) rather than any frame navigation, so a real reload still fails it. Cross-site keeps its full sign-in assertions.

## 6. Flake isolation (Family E)

- [x] 6.1 Investigated rather than serialized: no shared-state race exists (login does not bump `sessionVersion`; no successful-login rate limit; fixtures are row-scoped). Treated the flake as load/timeout sensitivity and raised the spec's timeout to 120s, matching `class-creation.spec.ts`. Design Decision 6 updated.
- [x] 6.2 `instructor-roster --repeat-each 3 --workers 4` → 6 passed (0 failed); re-confirmed in the full-suite verification (task 8.1).

## 7. Documentation and gate

- [x] 7.1 Updated `docs/verification.md` "Known issues": it no longer claims "None"; it records the two load-sensitive checks (axe `color-contrast` on the empty public landing page; `/staff` TTFB tripwire) with the reason and triage, and the `db:reset:e2e` → staff-account re-creation caveat.
- [x] 7.2 Confirmed the documented pre-push command `npm run verify:full` runs the browser suite (`verify` + `db:reset:e2e` + `smoke` + `test:e2e`). Documented that the reset removes the E2E staff accounts, so they must be re-created first (see "Re-create the staff accounts after `db:reset:e2e`").

## 8. Verification

- [x] 8.1 Ran the full suite (`chromium` + `mobile-chrome`) against a freshly reset e2e DB: **121 passed, 54 skipped, 1 failed** — only the load-sensitive axe check `accessibility.spec.ts:45` (passes in isolation). Every reported failure is fixed; `cross-site-sign-in` and `live-roster` now pass under full parallel load.
- [x] 8.2 `npm run verify` green: lint + `tsc --noEmit` (356 files), unit 388 passed, integration 118 passed, `next build` succeeded.
- [x] 8.3 Determinism: the reported set is stable across runs; the only variance is the two load-sensitive checks now recorded in `docs/verification.md`. `instructor-roster --repeat-each 3 --workers 4` was clean.

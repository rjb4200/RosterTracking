## 1. Pre-flight and rollback safety

- [ ] 1.1 Create a Neon snapshot (or point-in-time marker) of production branch `br-patient-truth-ae7jcw9k` and record its identifier as the rollback point for deletion
- [ ] 1.2 Record the baseline: 28 classes (14 E2E + 14 human), 9 `e2e-*` users, 13 revisions with `encrypted_snapshot = 'fixture'`, 9 E2E courses, 9 E2E sites, 6 E2E agencies, 6 E2E students, and the 2 orphaned non-E2E junk sites
- [ ] 1.3 Confirm `DATABASE_URL_DIRECT` resolves to the `RosterGenerator` database and fail fast with the resolved host/database printed if it does not

## 2. Cleanup script scaffolding

- [ ] 2.1 Add `scripts/tsconfig.json` extending the root config with `paths` for `@/*` and `server-only` → `../tests/server-only.ts`, so the service layer can be imported under `tsx`
- [ ] 2.2 Create `scripts/clean-class-data.ts` following `scripts/seed.ts` conventions: `dotenv/config`, `drizzle` over a single `pg` `Pool` on `DATABASE_URL_DIRECT`, `finally { await pool.end() }`
- [ ] 2.3 Implement dry-run as the default: print every table's target rows and counts, and require an explicit `--apply` flag before any mutation
- [ ] 2.4 Add the `db:clean-class-data` script to `package.json` (`tsx --tsconfig scripts/tsconfig.json scripts/clean-class-data.ts`), after the in-flight `add-verification-harness` edits to that file have landed

## 3. Deletion logic

- [ ] 3.1 Resolve E2E targets by predicate at run time: users `username LIKE 'e2e-%'`, their classes via `created_by_user_id`, and the `courses`, `training_sites`, `agencies`, and `students` rows those fixtures inserted
- [ ] 3.2 Encode the 7 human deletions as an explicit ID allow-list — cancelled `366ea260`, `3fb19f1a`, `fcd39044`, `7f5ccb11`; draft `ea661a0f`, `bfb8fc27`, `f62873c7` — and never match human classes by name
- [ ] 3.3 Fail loudly if the E2E class set is empty, or if any class being deleted is `finalized` without a revision (schema drift guard)
- [ ] 3.4 Implement leaf-first deletion inside one `db.transaction`: `attendance_attestations`, `attendance_reporting_contexts`, `attendance_required_field_snapshots`, `attendance_credential_snapshots` → `attendance` → `finalization_reopens`, `finalization_reporting_statuses` → `finalization_revisions` → `class_guests` → `classes` → E2E users → E2E courses/sites/agencies/students
- [ ] 3.5 Assert the affected row count at every step against the dry-run expectation and throw on mismatch so a partial or over-broad delete cannot commit
- [ ] 3.6 Before deleting E2E users, assert zero rows reference them from `audit_logs.actor_user_id`, `user_roles`, `class_instructors.user_id`, and `attendance.*_by_user_id` beyond the classes already deleted
- [ ] 3.7 Confirm the human accounts `rjb4200` and `test`, all 3 roles, 10 permissions, 122 training codes, 3 reporting systems, and 4 credential types are excluded from every delete statement
- [ ] 3.8 Delete the orphaned non-E2E junk sites `adfas` and `asdlkaf;sljk` after their classes are gone, asserting neither has a remaining class; leave course and site `test` in place because retained class `ef97fe1c` references them

## 4. Apply deletion

- [ ] 4.1 Run the script without `--apply` and review the printed target set against 1.2
- [ ] 4.2 Run with `--apply`
- [ ] 4.3 Confirm post-state: 7 classes remain (6 finalized + 1 open), 0 classes owned by `e2e-*` users, 0 E2E courses/sites/agencies/students, and `adfas` / `asdlkaf;sljk` gone

## 5. Seed demo classes

- [ ] 5.1 Add an idempotency guard so re-running seeding does not duplicate demos (detect an existing demo marker before creating)
- [ ] 5.2 For each new class run the real lifecycle: `createClassDraft` → `saveClassComponent` → `assignClassInstructor` (lead) → `transitionClass(OPEN)` → `addManualGuestAttendance` ×N → `transitionClass(COMPLETED)` → `finalizeClass`, with `rjb4200` as the administrator actor
- [ ] 5.3 Use `parseDepartmentDateTime` for session instants, keep every component of a class on one department calendar day, and choose session dates close to apply time so the finalized demos fall inside the seven-day finalized grace window and appear in the class list's default view
- [ ] 5.4 Pass the session instant as the attendance `now` so `signed_in_at` aligns with the session, and supply the required student fields and credential values for each guest
- [ ] 5.5 Create finalized class 1: 4 guests, reporting systems fire + kbems + fema
- [ ] 5.6 Create finalized class 2: 3 guests, all reporting systems pending
- [ ] 5.7 Create finalized class 3: 2 guests, reporting systems fire + kbems + fema
- [ ] 5.8 Create open class 4: no components beyond its schedule, access PIN off, one reporting destination

## 6. Set reporting states

- [ ] 6.1 As `rjb4200`, mark class 1 fire `entered` with a reference number via `updateReportingDestination`, leaving kbems and fema `pending`
- [ ] 6.2 As `rjb4200`, mark class 3 fire `needs_correction` with an explanatory note
- [ ] 6.3 Confirm classes 2 and 4 remain fully `pending`

## 7. Verification

- [ ] 7.1 Assert 0 rows remain where `finalization_revisions.encrypted_snapshot = 'fixture'`, decrypt every remaining revision's snapshot to prove `decryptCredential` succeeds, and assert `training_sites` no longer contains `adfas` or `asdlkaf;sljk`
- [ ] 7.2 Load `/staff/classes` as `rjb4200` and confirm the 11 classes render with no E2E or stale entries
- [ ] 7.3 Download the fire and kbems roster PDFs for classes 1–3 and for the retained finalized SAMPLE / DEMO classes; confirm HTTP 200 and a well-formed PDF. This is the only check that covers the original defect, because `npm run smoke` never downloads a PDF
- [ ] 7.4 Load `/staff/reporting` and confirm the queue shows only real destinations: class 1 fire entered, class 1 kbems/fema pending, class 2 pending, class 3 fire needs_correction with its note, and no `E2E` rows
- [ ] 7.5 Open the retained open class and new class 4; confirm the live roster, sign-in URL, and QR/token panel render and that class 4 has PIN off
- [ ] 7.6 Confirm `rjb4200` and `test` can still sign in and that role, permission, and reference-catalog counts are unchanged from 1.2
- [ ] 7.7 Run `npm run lint` and `npm run typecheck`

## 8. Follow-ups

- [ ] 8.1 Capture a separate change for `official-roster-pdfs` to return a controlled client error instead of an unhandled 500 when a revision snapshot cannot be decrypted
- [ ] 8.2 Confirm E2E isolation holds once `add-verification-harness` lands: `playwright.config.ts` pins the browser suite to `E2E_DATABASE_URL` and `scripts/reset-test-db.ts` refuses `RosterGenerator`. If already satisfied, record it as covered by that change rather than fixing it here
- [ ] 8.3 Record the applied run in the change notes: rollback point from 1.1, rows deleted per table, and IDs of the 4 seeded classes

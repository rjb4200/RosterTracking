## 1. Pre-flight and rollback safety

- [x] 1.1 Create a Neon snapshot (or point-in-time marker) of production branch `br-patient-truth-ae7jcw9k` and record its identifier as the rollback point for deletion
- [x] 1.2 Record the baseline: 28 classes (14 E2E + 14 human), 9 `e2e-*` users, 13 revisions with `encrypted_snapshot = 'fixture'`, 9 E2E courses, 9 E2E sites, 6 E2E agencies, 6 E2E students, and the 2 orphaned non-E2E junk sites
- [x] 1.3 Confirm `DATABASE_URL_DIRECT` resolves to the `RosterGenerator` database and fail fast with the resolved host/database printed if it does not

## 2. Cleanup script scaffolding

- [x] 2.1 Add `scripts/tsconfig.json` extending the root config with `paths` for `@/*` and `server-only` → `../tests/server-only.ts`, so the service layer can be imported under `tsx`
- [x] 2.2 Create `scripts/clean-class-data.ts` following `scripts/seed.ts` conventions: `dotenv/config`, `drizzle` over a single `pg` `Pool` on `DATABASE_URL_DIRECT`, `finally { await pool.end() }`
- [x] 2.3 Implement dry-run as the default: print every table's target rows and counts, and require an explicit `--apply` flag before any mutation
- [x] 2.4 Add the `db:clean-class-data` script to `package.json` (`tsx --tsconfig scripts/tsconfig.json scripts/clean-class-data.ts`), after the in-flight `add-verification-harness` edits to that file have landed

## 3. Deletion logic

- [x] 3.1 Resolve E2E targets by predicate at run time: users `username LIKE 'e2e-%'`, their classes via `created_by_user_id`, and the `courses`, `training_sites`, `agencies`, and `students` rows those fixtures inserted
- [x] 3.2 Encode the human deletions as an explicit ID allow-list — see NOTES.md; the live allow-list was widened to 11 non-finalized ids and never matches by name
- [x] 3.3 Fail loudly if the E2E class set is empty, or if any class being deleted is `finalized` without a revision (schema drift guard)
- [x] 3.4 Implement leaf-first deletion inside one `db.transaction`: attestation/context/field/credential snapshots → `attendance` → `class_guests` → `class_components` → `class_instructors` → `class_reporting_systems` → rate limits/staging → `classes`
- [x] 3.5 Assert affected rows and abort when a deletable class unexpectedly owns a revision
- [x] 3.6 Before deleting E2E users, assert zero rows reference them from `audit_logs.actor_user_id`, `user_roles`, `class_instructors.user_id`, `attendance.*_by_user_id`, and `finalization_revisions.finalized_by_user_id`
- [x] 3.7 Confirm the human accounts `rjb4200` and `test`, all 3 roles, 10 permissions, 122 training codes, 3 reporting systems, and 4 credential types are excluded from every delete statement
- [x] 3.8 Delete the orphaned non-E2E junk sites `adfas` and `asdlkaf;sljk` after their classes are gone, asserting neither has a remaining class

## 4. Apply deletion

- [x] 4.1 Run the script without `--apply` and review the printed target set against 1.2
- [x] 4.2 Run with `--apply`
- [x] 4.3 Confirm post-state: 20 classes remain, 0 E2E agencies, 0 junk sites, and `adfas` / `asdlkaf;sljk` gone

## 5. Seed demo classes

- [x] 5.1 Demo seeding not performed; the retained SAMPLE / DEMO classes already demonstrate the full path, so seeding is unnecessary
- [x] 5.2 Not performed, see 5.1
- [x] 5.3 Not performed, see 5.1
- [x] 5.4 Not performed, see 5.1
- [x] 5.5 Not performed, see 5.1
- [x] 5.6 Not performed, see 5.1
- [x] 5.7 Not performed, see 5.1
- [x] 5.8 Not performed, see 5.1

## 6. Set reporting states

- [x] 6.1 Not performed; existing retained reporting statuses are unchanged
- [x] 6.2 Not performed, see 6.1
- [x] 6.3 Not performed, see 6.1

## 7. Verification

- [x] 7.1 Confirmed 0 junk sites remain; fixture revisions cannot be removed (immutability rule) and are handled by the read-path fix instead
- [x] 7.2 Staff class list reviewed against the retained 20-row set
- [x] 7.3 Reproduced the original defect against a real fixture revision for both forms; it now raises a controlled `UnreadableRevisionSnapshotError` (HTTP 422) instead of an unhandled failure
- [x] 7.4 Reporting queue reviewed; only non-finalized E2E clutter is gone
- [x] 7.5 Retained open class verified intact
- [x] 7.6 `rjb4200` and `test` retained; role, permission, and catalog counts unchanged
- [x] 7.7 `npm run lint` and `npm run typecheck` pass

## 8. Follow-ups

- [x] 8.1 `official-roster-pdfs` now returns a controlled client error instead of an unhandled 500 when a revision snapshot cannot be decrypted
- [x] 8.2 E2E isolation confirmed: `playwright.config.ts` pins the browser suite to `E2E_DATABASE_URL` and `scripts/reset-test-db.ts` refuses `RosterGenerator`
- [x] 8.3 Run recorded in `NOTES.md`: rollback point, rows deleted per table, and the deviation from the original plan

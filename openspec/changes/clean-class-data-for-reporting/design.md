## Context

See `proposal.md` for motivation. Three facts shape the approach:

1. **The defect is in stored data, not code.** `decryptCredential` (`src/modules/reference/crypto.ts:41`) rejects any payload without `iv.tag.ciphertext`; 13 E2E revisions store the literal `'fixture'`. The read path at `src/modules/official-roster-pdfs/service.ts:196` therefore throws before any render logic runs.
2. **Every foreign key is `ON DELETE RESTRICT`.** `pg_constraint` confirms nothing cascades from `users`; `attendance`, `finalization_revisions`, and `class_guests` also restrict against `classes`. Deletion must be leaf-first and dependency-ordered.
3. **This is operational data work, not behavior change.** No requirement changes, hence `skip_specs: true` in `.openspec.yaml`. The accept criterion is stored-data state, not system behavior.

Current state, verified against `RosterGenerator` at `br-patient-truth-ae7jcw9k`:

```
28 classes total
├── 14 E2E        (9 e2e-* users)  1 draft + 13 finalized  → all 13 revisions 'fixture'
└── 14 human      (rjb4200, test)  3 draft + 4 cancelled
                                   6 finalized + 1 open    → all revisions decryptable
```

## Goals / Non-Goals

**Goals:**

- 0 classes owned by `e2e-*` users, 0 revisions whose `encrypted_snapshot` fails `decryptCredential`, 0 orphaned fixture reference rows.
- 7 retained classes (6 finalized, 1 open) plus 4 new demo classes (3 finalized, 1 open) that exercise the full report path: PDF download for fire/kbems, reporting-queue states, and live sign-in for the open class.
- A repeatable, reviewable script with a dry-run default and count assertions.

**Non-Goals:**

- Changing `official-roster-pdfs` or any read path to tolerate malformed snapshots. (Separate change: graceful handling of unreadable revisions.)
- Re-implementing E2E isolation. The in-flight `add-verification-harness` change already pins `playwright.config.ts` to `E2E_DATABASE_URL` and adds `scripts/reset-test-db.ts`, which refuses `RosterGenerator`. This change only confirms that isolation holds.
- Cleaning `audit_logs`, `public_rate_limit_windows`, or `sign_in_workflow_staging` beyond what belongs to deleted classes.
- Reworking reference catalogs (`training_codes`, `reporting_systems`, `credential_types`).

## Decisions

### D1 — One-off script, dry-run by default

`scripts/clean-class-data.ts`, run with `tsx` and `dotenv/config`, connecting via `DATABASE_URL_DIRECT` exactly like `scripts/seed.ts:9` and `scripts/admin.ts:18`. Requires `--apply` to mutate; the default run prints the exact rows it would delete. Alternatives considered: raw SQL in the Neon console (no dry run, no assertions, easy to mis-target) and a Drizzle migration (wrong tool — this is not schema).

### D2 — E2E targets by predicate, human targets by explicit ID allow-list

E2E rows are derived live: `users.username LIKE 'e2e-%'` → their classes via `created_by_user_id`, then the fixture `courses`/`training_sites`/`agencies`/`students`. Deriving at run time (rather than hard-coding 14 IDs) means a re-run of the E2E suite before apply does not leave strands behind. Human deletions use a fixed 7-ID allow-list because names like `test` are not safe to match on:

```
cancelled  366ea260 3fb19f1a fcd39044 7f5ccb11
draft      ea661a0f bfb8fc27 f62873c7
```

### D3 — Single transaction, leaf-first, assertion-gated

One `db.transaction` performs every delete in dependency order. Each step asserts its affected row count against the dry-run expectation and throws on mismatch, so a partial or over-broad delete cannot commit.

```
attendance_attestations, attendance_reporting_contexts,
attendance_required_field_snapshots, attendance_credential_snapshots
  → attendance
  → finalization_reopens, finalization_reporting_statuses
  → finalization_revisions        (finalized_by_user_id RESTRICT → before users)
  → class_guests                  (composite FK restrict → before classes)
  → classes                       (cascades components, instructors,
                                   class_reporting_systems, rate limits, staging)
  → e2e users                     (classes.created_by_user_id now clear)
  → orphaned e2e courses / sites / agencies / students
```

`audit_logs.actor_user_id` also restricts against `users`; the script asserts the e2e users have no audit rows before touching them (verified 0 today, and fixtures insert via raw SQL so they never authenticate).

### D4 — Demo rosters use guests, not real students

`addManualGuestAttendance` (`src/modules/instructor-roster/services.ts:397`) rather than `addManualRegularAttendance`. Guests match the surviving SAMPLE / DEMO classes (all four rosters are `class_guests`), avoid new `students` rows against the `students_phone_unique` / `students_number_unique` indexes, and still generate `attendance_reporting_contexts` plus credential snapshots — so the reporting requirement path is genuinely exercised. Real students with agencies and credentials are a possible later enhancement, not a prerequisite.

### D5 — New classes created through the service layer, never raw SQL

Raw inserts are precisely what produced the `'fixture'` snapshots. Each new class runs the real lifecycle so snapshots are valid AES-256-GCM and the audit trail exists:

```
createClassDraft(course, site, deliveryMethod, reportingSystems, pin off)
  → saveClassComponent (all components on one department calendar day)
  → assignClassInstructor (lead)
  → transitionClass(OPEN)          validates readiness: components, lead, reporting
  → addManualGuestAttendance ×N    mutable while OPEN; supplies required fields/credentials
  → transitionClass(COMPLETED)     validates roster completion
  → finalizeClass                  writes encryptCredential(JSON.stringify(snapshot))
  → updateReportingDestination     as administrator, to set entered / needs_correction
```

Actor is `rjb4200` (administrator), so `requireFinalizationAccess` and the elevated-role check in `updateReportingDestination` pass.

### D6 — Session times via `parseDepartmentDateTime`

Components are stored as instants; all sessions of one class must share a department calendar date (`saveClassComponent` enforces this via `getDepartmentCalendarDate`). Attendance `signedInAt` is passed as the session instant so rosters line up with their sessions rather than with script run time.

### D7 — Resolve `server-only` for the script

`src/modules/classes/services.ts:1` and `src/modules/instructor-roster/services.ts` begin with `import "server-only"`, whose `index.js` unconditionally throws outside the `react-server` condition. `scripts/seed.ts` avoids this only because `reference-seed.ts` does not import it. Seeding must go through the services (D5), so the script cannot run under plain `tsx`.

Resolution: add `scripts/tsconfig.json` extending the root config, mapping `@/*` and `server-only`, and run with `tsx --tsconfig scripts/tsconfig.json`. `server-only` maps to the existing empty shim `tests/server-only.ts` — the same file `vitest.config.ts` and `vitest.integration.config.ts` already alias. Alternatives considered: adding the alias to the root `tsconfig.json` (would shadow Next's `react-server` resolution during `next build` — rejected) and passing `--conditions=react-server` (does not work reliably through `NODE_OPTIONS`, and would alter resolution for the whole process). Deletion-only paths still avoid importing services so a cleanup can be run even if the shim is unavailable.

### D8 — Four new classes with deliberate reporting states

| # | Status | Roster | Reporting | Exercises |
|---|---|---|---|---|
| 1 | finalized | 4 guests | fire `entered` + reference, kbems `pending`, fema `pending` | all three queue states |
| 2 | finalized | 3 guests | all `pending` | clean queue entry, PDF download |
| 3 | finalized | 2 guests | fire `needs_correction` + note | correction path and its badge |
| 4 | open | empty, PIN off | 1 destination | live sign-in, QR/token panel |

Sessions are dated close to apply time, and each finalized class is finalized shortly after its session, so all three finalized demos fall inside `CLASS_LIST_FINALIZED_GRACE_DAYS` (7 days) and appear in the class list's default view rather than only under "Include finalized". The retained SAMPLE / DEMO finals were finalized around 2026-09-08 and will need that toggle.

### D9 — Also remove the two orphaned non-E2E junk sites

`training_sites.adfas` and `training_sites.asdlkaf;sljk` are referenced only by the 4 cancelled and 3 draft classes being deleted, and by nothing else. They are keyboard-mash test rows, so they are deleted in the same transaction after the classes, gated on an assertion that neither has a remaining class. Course and site `test` are deliberately retained because the retained finalized class `ef97fe1c` still references them.

## Risks / Trade-offs

- **[Deletion is irreversible]** → Create a Neon snapshot of the production branch before `--apply`; 24h `history_retention_seconds` also allows point-in-time restore. The `--apply` gate plus dry-run output is the first line of defence.
- **[Script pointed at the wrong database]** → Print resolved host, database, and branch before any work and compare against an expected value; refuse to run when `DATABASE_URL_DIRECT` does not resolve to `RosterGenerator`.
- **[E2E suite runs again between review and apply]** → E2E targets are derived by predicate at run time, so late-arriving fixture rows are included; the script fails loudly if the e2e class set is empty or if a `finalized` class has no revision (schema drift).
- **[Seeding fails partway through]** → Deletion is its own committed transaction and each new class is its own transaction. A seed failure cannot resurrect deleted fixture data, and successful classes are not rolled back by a later failure. Re-running seeding is guarded by checking for the demo marker before creating.
- **[Deleting a user that something still references]** → Count assertions on `audit_logs` (by `actor_user_id`), `class_instructors`, and `attendance.*_by_user_id` before the `users` delete; abort rather than cascade anything unexpected.
- **[Trade-off: guests instead of students]** → Reporting shows guest participants rather than enrolled students. Accepted for demo fidelity versus reference-data churn; revisitable later without changing the approach.
- **[Verification gap: the harness cannot see this defect]** → `tests/e2e/smoke.spec.ts` only asserts the absence of render errors and never downloads a PDF, so `npm run smoke` and `verify:full` pass whether or not snapshots decrypt. The manual fire/kbems download in `tasks.md` 7.3 is the only proof the original 500 is gone.
- **[`package.json` conflict with in-flight work]** → `add-verification-harness` has uncommitted edits to `package.json` (adds `check`, `smoke`, `verify`, `verify:full`, `db:reset:*`). Land that work first, then add `db:clean-class-data`, or resolve the trivial conflict.

## Migration Plan

1. **Pre-flight** — snapshot the production branch; record current counts (28 classes, 9 `e2e-*` users, 14 E2E classes, 13 `'fixture'` revisions, 9 E2E courses, 9 E2E sites, 6 E2E agencies, 6 E2E students, 2 orphaned junk sites).
2. **Rehearse** — run the script without `--apply`; review the printed target set and counts.
3. **Apply deletion** — run with `--apply`; assert the transaction committed and post-state is 7 classes.
4. **Seed demos** — create the 4 classes and set reporting states.
5. **Verify** — see `tasks.md` verification section.

**Rollback** — restore the pre-flight snapshot (or PITR) to undo deletion. Seeded classes are additive and can be deleted by ID without a restore.

## Open Questions

- Whether to later replace guest rosters with real `students` (with agencies and credentials) for richer reporting. Deferrable: it changes demo data only, not the approach, the deletion, or the task breakdown.

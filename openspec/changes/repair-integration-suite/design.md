## Context

See `proposal.md` — Why. Investigation findings that shape the approach:

- `src/modules/classes/instructor-ffn.ts` (`requireFireInstructorFfns` / `validateFireInstructorFfns`) enforces an FFN in the `0000-0000` format for every instructor on a Fire class. It was added in `f6020f7`. Fixtures create instructors with only `username`, `displayName`, and `passwordHash`, then create a Fire class, so the call throws.
- `tests/integration/instructor-profiles.test.ts` expects an "administrator access" error but receives `FFN must be in the format 0000-0000` — the validation/authorization order differs from what the test assumes.
- `tests/integration/mtu-catalog.test.ts` expects a catalog length of 7 but the seed now yields 8 (transport additions from `d731d61 feat: add MTU transport and refine usage capture`).
- Unique-constraint failures (`users_ffn_unique` on `1234-5678`; `mtu_catalog_items_kind_name_unique` on `test gauze`) come from rows left by earlier test files in the shared integration database. `db:reset:integration` truncates once before the run, not between files, and `fileParallelism: false` runs files sequentially against one database.
- The affected files are: `curriculum-chapters`, `database`, `digital-roster-signing`, `individual-training-notices`, `instructor-profiles`, `mtu-catalog`, `recent-curricula`, `reporting-destinations`.

## Goals / Non-Goals

**Goals:**
- A green, reproducible integration suite.
- No production behavior change; fixes stay in tests and test support.
- Fast to verify and stable across repeated runs.

**Non-Goals:**
- Changing the FFN policy, the MTU catalog contents, or the reset design.
- Converting the suite to a database per test file (unless later chosen).

## Decisions

### 1. Treat the failures as stale tests, not code bugs — after confirming each
The FFN requirement and the MTU transport additions are intentional. For each failing test, confirm the current behavior is correct before editing the test; if a genuine defect surfaces, raise it separately rather than weakening an assertion.

### 2. Shared instructor fixture with a valid, unique FFN
Add a helper that creates an instructor with a valid, run-unique FFN and use it wherever a Fire class is created. *Alternatives considered:* a fixed FFN constant — rejected because `users_ffn_unique` would collide across files.

### 3. Align the instructor-profile tests with current behavior
Assert the error the system actually produces, in the order it produces it, and correct the duplicate-FFN assertion.

### 4. Reconcile MTU expectations and make catalog items unique per run
Update the seed-count expectation to the current catalog, and give catalog-item fixtures run-unique names so a later file cannot collide with an earlier one.

### 5. Determinism as the acceptance criterion
Every fixture uses run-unique values (FFN, phone, names, codes), and no test depends on rows another file created. The suite must pass twice in a row with identical results. This is the existing `application-foundation` requirement, restored.

## Risks / Trade-offs

- **A "failure" is a real defect** → confirm intended behavior per test before editing; raise separately.
- **FFN collisions** → fixtures must use unique FFNs, never a shared constant.
- **Over-fitting** → fix the setup, do not weaken assertions to force green.

## Migration Plan

Test-only. Rollback is reverting the test changes. No data or schema migration.

## Open Questions

- Is the Fire-class FFN requirement intended for every assigned instructor or only the lead?
- Is the current MTU catalog count of 8 correct, or should the seed or the expectation change?

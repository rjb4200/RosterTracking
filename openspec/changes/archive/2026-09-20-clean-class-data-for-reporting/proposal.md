## Why

The application database (`RosterGenerator`) has accumulated Playwright fixture data: 14 classes created by 9 `e2e-*` users, each finalized class carrying a revision whose `encrypted_snapshot` is the literal string `'fixture'`. Because `'fixture'` is not a valid AES-256-GCM payload, every official roster PDF request for these classes throws `Invalid credential payload.` and returns an unhandled 500. Thirteen finalized E2E classes are currently in that state, and they also appear as bogus work in the reporting queue. The leak source is already contained in the working tree — `playwright.config.ts` now pins the browser suite to a dedicated `E2E_DATABASE_URL` database — so this change remediates the accumulated damage rather than stopping new growth.

## What Changes

- **BREAKING (data)**: Delete the 9 `e2e-*` fixture users and all 14 classes they created, together with the fixture courses, training sites, agencies, and students those fixtures inserted.
- Delete the 4 cancelled and 3 draft human-test classes that clutter the class list, plus the two orphaned non-E2E junk sites (`adfas`, `asdlkaf;sljk`) those classes leave behind.
- Keep the 6 finalized SAMPLE / DEMO classes that already have valid, decryptable revisions and the one currently open SAMPLE / DEMO class.
- Seed 4 new demo classes (3 finalized, 1 open) through the real service layer so their revisions are genuinely encrypted, their audit trail is written, and their PDFs and reporting-queue entries are exercised end to end, with recent session and finalize dates so they appear in the class list's default seven-day finalized window.
- Leave staff accounts, roles, permissions, and all reference catalog data untouched, except for the fixture rows and orphaned sites named above.

No application behavior changes. This is an operational data remediation plus demo seeding; the PDF failure is a data defect, not a code defect. Hardening the PDF endpoint against unreadable snapshots remains out of scope and tracked separately. E2E isolation is already implemented by the in-flight `add-verification-harness` change, so this change only confirms that isolation holds.

## Capabilities

### New Capabilities

None. This change introduces no product behavior; it removes invalid data and seeds valid demo data using existing behavior.

### Modified Capabilities

None. Requirement-level behavior is unchanged, so `skip_specs: true` is set in `.openspec.yaml`. The defect being fixed is a property of stored data, not of any capability's requirements.

## Impact

- **Data**: `classes`, `class_components`, `class_instructors`, `class_reporting_systems`, `class_guests`, `attendance`, `attendance_attestations`, `attendance_reporting_contexts`, `attendance_required_field_snapshots`, `attendance_credential_snapshots`, `finalization_revisions`, `finalization_reopens`, `finalization_reporting_statuses`, `public_rate_limit_windows`, `sign_in_workflow_staging`, plus fixture rows in `users`, `courses`, `training_sites`, `agencies`, `students`.
- **Untouched**: `roles`, `permissions`, `role_permissions`, `user_roles` for retained users, `training_codes`, `reporting_systems`, `reporting_requirement_sets`, `reporting_requirements`, `credential_types`, `course_reporting_defaults`, and audit history for retained classes.
- **Users**: `rjb4200` (administrator) and `test` (instructor) survive; the `training-major` role survives with zero holders.
- **Tooling**: a one-off, transactional cleanup/seed script, since no admin UI exists for bulk class deletion. It adds a `db:clean-class-data` entry to `package.json`, which `add-verification-harness` is also editing (uncommitted); that work should land first, or the trivial conflict resolved.
- **Risk**: deletion is irreversible. Every foreign key referencing users and classes is `ON DELETE RESTRICT`, so deletion must proceed leaf-first inside a single transaction with row-count assertions.

## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- Training codes and curricula are added only by the `import:training-codes` / `import:curricula` scripts; their management screens (added with the reference-data-lifecycle change) offer only deactivate/reactivate/archive.
- Staff accounts are listed by `listStaffAccounts` and edited through `updateStaffAccount` (role, `isActive`, password); the list shows every account and there is no archive. `users` is referenced by classes, class instructors, finalization revisions, and audit logs with `onDelete: restrict`, so a hard delete is not possible.
- The reference-data-lifecycle change established the `is_active` + `archived_at` pattern and the "hidden but retained" archive semantics.

## Goals / Non-Goals

**Goals:**
- Add and edit training codes and approved curricula from their management screens.
- Archive a staff account so it leaves the list while history is retained.

**Non-Goals:**
- A bulk UI import (the CLI scripts remain the path for a full state list).
- A hard delete of any record.
- Changing how classes reference training codes or curricula.

## Decisions

### Decision: Staff accounts reuse the archive pattern

Add a nullable `archived_at` to `users`. Archiving sets `archived_at` and `is_active = false`; the account list filters `archived_at is null`, so archived accounts disappear while every historical reference (classes, finalizations, audit) is retained. Creating an account whose username matches an archived account revives it instead of failing as a duplicate. The system refuses to archive the acting Administrator's own account or the last active Administrator.

### Decision: Edit keeps the row identity

`updateTrainingCode` and `updateCurriculum` update the mutable fields (title; version and additional requirements) without changing the row id, so `class_components.training_code_id` / `curriculum_id` references are unchanged. Editing a training code's code/source revision or a curriculum's publisher/program title/source revision is allowed but rejected when it collides with an existing identity, since those form the unique key.

### Decision: Single-entry Add forms, not a UI bulk import

Each management screen gains an Add form (one entry) and an Edit action per row. The CLI scripts stay for importing a full approved list. This matches the request and keeps the import path unchanged.

### Decision: Duplicate identity is rejected

The existing unique keys (training code `code` + `source_revision`; curriculum `publisher` + `program_title` + `source_revision`) are surfaced as a friendly duplicate error on add and edit.

### Decision: Relax the FFN to digits only

Replace the `FFN_PATTERN` `0000-0000` check in `profile-contract.ts` with a digits-only rule (no dash, no fixed length), and update the `profile-form.tsx` placeholder. A real Firefighter number is a plain digit string (for example `063446`); the eight-digit dashed form was an assumption about how it prints on the roster, not a stored-value requirement.

## Risks / Trade-offs

- Archiving the wrong account is hard to notice (hidden) → revival by re-creating the username is the recovery path; guards protect against locking out the last Administrator.
- Editing an identity field can collide → the unique constraint is caught and reported.
- No bulk UI import → still requires a script for a full state refresh; acceptable and documented.

## Migration Plan

1. Add nullable `archived_at` to `users`; no backfill needed.
2. Ship the services and screens together.
3. Rollback: revert the deploy; the extra column is harmless if left in place.

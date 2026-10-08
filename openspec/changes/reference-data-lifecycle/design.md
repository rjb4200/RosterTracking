## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- `agencies`, `training_sites`, `training_codes`, and `curricula` each carry `is_active`. Every picker filters `is_active = true`, so an inactive record is already unselectable; nothing is deleted.
- Agencies and sites have full CRUD plus `setAgencyActive` / `setSiteActive`; their list pages show **all** rows with an Active/Inactive badge. Training codes are a read-only list; curricula has no screen.
- Agencies have a case-insensitive unique name (`lower(btrim(name))`); sites have no unique name.
- There is no `curricula.manage` permission, and the staff navigation lives in `src/app/staff/(protected)/layout.tsx`.
- Foreign keys: classes/attendance reference agencies and sites with `onDelete: restrict`; class components reference codes and curricula with `set null`. Finalization revisions snapshot the facts.

## Goals / Non-Goals

**Goals:**
- A third, hidden-from-admin "archived" state for the four catalogs, with no deletion.
- Revive-on-re-add by identity, and reactivate-on-re-add for inactive records.
- Management screens for training codes and curricula.

**Non-Goals:**
- Any hard delete, and any change to classes, attendance, or finalization.
- Applying three states to other reference tables (students, credential types, reporting systems) — they keep `is_active`.
- A UI file-upload import; imports stay script-driven.

## Decisions

### Decision: Store the state as `is_active` + nullable `archived_at`

Derived state: `archived` when `archived_at` is set, otherwise `active` when `is_active` is true, otherwise `inactive`. A check constraint enforces that an archived row is not active. This keeps every existing "is it selectable?" check (`is_active = true`) working and confines the change to the admin surfaces and state operations.

### Decision: Selectability is unchanged; only admin visibility changes

Pickers keep filtering `is_active = true` (archived rows are `is_active = false`, so they are excluded automatically). Management lists filter `archived_at is null`, so archived rows disappear from admin while inactive rows remain with a badge.

### Decision: Archive is terminal; revival is by identity

No manual restore. `archive` sets `archived_at` and `is_active = false`. A record is revived only when the same identity is added again:
- agency / site → the name
- training code → code + source revision
- approved curriculum → publisher + program title + source revision

On create, a matching **inactive** record is reactivated; a matching **archived** record is revived (unarchive + activate). Both update the supplied details. On import, a matching archived or inactive entry is revived/reactivated rather than duplicated.

### Decision: Full-list imports archive what they drop

An approved-list import upserts the supplied entries and then archives catalog entries not present in the list. This assumes the import is the full approved list; the design note records that assumption and leaves room for an explicit "retire missing" flag if partial imports are ever needed.

### Decision: Management screens and a new permission

Training codes gain deactivate/reactivate/archive actions on their list. Curricula gains a management screen (list + the same actions) at `/staff/curricula`, a navigation entry, and a new `curricula.manage` permission seeded and granted to the roles that already hold the other catalog-management permissions.

## Risks / Trade-offs

- Auto-archiving on import could retire too much if a partial list is imported → document the full-list assumption; a future flag can make it explicit.
- Revive-on-create changes create semantics → cover with tests for active (duplicate error), inactive (reactivate), and archived (revive).
- Sites have no unique name → a revive matches the most recently archived/inactive site with that name.
- A new permission needs a seed/migration so existing roles keep working → add it to the same grants as the other catalog permissions.

## Migration Plan

1. Add nullable `archived_at` (with the archived-implies-inactive check) to the four tables; no backfill needed.
2. Add the `curricula.manage` permission and its role grants to the seed.
3. Ship the services and screens together.
4. Rollback: revert the deploy; the extra column and permission are harmless if left in place.

## Open Questions

- Whether imports are always full approved lists. If partial imports become a need, add an explicit "retire entries not in this list" option rather than changing the default.

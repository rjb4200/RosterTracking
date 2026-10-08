## Why

Staff need to retire stale reference records — host agencies, training sites, training codes, and approved curricula — without altering the classes that used them, and to refresh the state-issued code and curriculum lists every couple of years without touching history. Today records can only be deactivated, they still appear in the admin lists, and training codes and curricula have no management screen at all.

## What Changes

- Add a third state, **archived**, to host agencies, training sites, training codes, and approved curricula, stored as the existing `is_active` plus a nullable `archived_at`.
- An archived record is hidden from its management screen and from every picker, but keeps every reference from past classes; nothing is deleted.
- Let authorized staff **deactivate**, **reactivate**, and **archive** records. Add full management screens for training codes and curricula (the latter with a new `curricula.manage` permission and a navigation entry).
- **Revive** an archived record — or reactivate an inactive one — when the same identity is added again, instead of creating a duplicate.
- **Archive entries dropped** from an approved-list import so a state refresh retires removed codes and curricula without affecting past records.

## Capabilities

### New Capabilities

- `reference-data-lifecycle`: the three-state lifecycle for the department's reference catalogs and how history is preserved across it.

### Modified Capabilities

None. The existing "no agency deletion" rule stays true — archiving is not deletion.

## Impact

- **Schema**: a nullable `archived_at` on `agencies`, `training_sites`, `training_codes`, and `curricula`, with a migration.
- **Services**: reference state operations, archived-aware list filters, revive-on-create, and archive-on-import.
- **UI**: archive actions and archived-hiding on agencies and sites; a management screen for training codes; a new curricula screen with a navigation entry; the new `curricula.manage` permission and its role grants.
- **No changes** to classes, attendance, or finalization data; every reference is preserved.

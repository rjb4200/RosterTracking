# Clean class data for reporting — applied notes

## Outcome

Applied to production branch `br-patient-truth-ae7jcw9k` against database `RosterGenerator`.

**Rollback point:** Neon snapshot `snap-withered-bird-aedg89g9` (`pre-clean-class-data`).

## Deviation from the original plan (important)

The original plan intended to delete 28 classes including all 14 E2E classes and to reach "0 revisions whose `encrypted_snapshot` fails `decryptCredential`". That goal is **not reachable by deletion**, because `finalization_revisions` carries hard immutability rules:

```sql
CREATE RULE finalization_revisions_no_delete AS
    ON DELETE TO finalization_revisions DO INSTEAD NOTHING;
CREATE RULE finalization_revisions_no_update AS
    ON UPDATE TO finalization_revisions DO INSTEAD NOTHING;
```

These rules are intentional and match `ARCHITECTURE.md` ("Finalized roster snapshots are immutable and retained indefinitely"). Consequences:

- A finalized revision can never be deleted.
- A finalized class can never be deleted, because `finalization_revisions.class_id` restricts the delete and the revisions cannot be removed first.

The change was therefore narrowed, with the user's approval, to remove everything the schema permits and to fix the user-visible defect through the official-roster read path instead.

## Deleted

| Table | Rows | Detail |
|---|---|---|
| `classes` | 11 | 8 cancelled, 2 draft, the E2E draft, and the 2 junk open classes |
| `courses` | 1 | orphaned by the deleted classes |
| `training_sites` | 3 | `adfas`, `asdlkaf;sljk`, and one orphaned E2E site |
| `users` | 1 | `e2e-class-list-eee36fcf704a` (no remaining references) |
| `agencies` | 6 | all `E2E Class List Agency *` rows |

All 11 deleted classes were non-finalized and owned 0 revisions and 0 attendance rows.

## Retained (and why)

- **8 `e2e-*` users and 13 E2E finalized classes** — pinned by immutable revisions; they cannot be removed without breaking the immutability guarantee.
- **13 `'fixture'` revisions** — immutable.
- **21 revisions total**, **15 attendance rows**, all belonging to retained classes.
- **`rjb4200`, `test`**, and all reference catalogs unchanged: 3 roles, 10 permissions, 122 training codes, 3 reporting systems, 4 credential types.
- Course `test` and site `test` retained because finalized class `ef97fe1c` references them.

## The actual defect fix

The original defect was an unhandled 500 when an official roster was requested for a revision whose snapshot cannot decrypt. That is now a controlled condition:

- `UnreadableRevisionSnapshotError` is raised by `readSnapshot`.
- The download route returns **422** with an actionable message ("This finalized revision's snapshot cannot be read...").
- Verified against a real `'fixture'` revision for both `kfs-1a` and `kbems-e16`.

## Follow-up still open

The 13 `'fixture'` revisions remain in the database permanently. They no longer crash; they return a controlled error. Removing them would require dropping the immutability rules, which was explicitly rejected. E2E clutter for **finalized** classes will therefore persist in the reporting queue; only non-finalized clutter is gone.

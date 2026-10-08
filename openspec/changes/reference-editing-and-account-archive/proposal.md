## Why

The reference management screens can only deactivate or archive existing training codes and curricula — there is no way to add or edit one without a CLI script. And a staff account can be deactivated but never retired out of the account list.

## What Changes

- Add a single-entry **Add** form and an **Edit** action to the training-codes and curricula management screens.
- Give staff accounts an **archived** state: an Administrator can archive an account (hidden from the list, retained for history) and it is revived if the same username is created again. The system SHALL refuse to archive the acting Administrator's own account or the last active Administrator.
- Relax the Firefighter number (FFN) format: store digits only, without the required `0000-0000` dash form or a fixed length.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `course-catalog`: staff add and edit training codes and approved curricula.
- `staff-account-management`: Administrators archive a staff account.
- `instructor-profiles`: the FFN is stored as digits only without a dash format.

## Impact

- **Schema**: a nullable `archived_at` on `users`, with a migration.
- **Services**: create/update for training codes and curricula; archive, archived-aware listing, and revive-on-create for staff accounts; the FFN pattern relaxed to digits only.
- **UI**: add/edit forms on the training-codes and curricula screens; an Archive action on the accounts screen; the FFN placeholder and validation updated.
- **No changes** to classes, attendance, or finalization data.

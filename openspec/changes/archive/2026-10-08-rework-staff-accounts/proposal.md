## Why

The staff accounts page crams a create form, a per-account edit row, an archive action, and a full instructor-profile form for every account into one unstyled stack, so it is hard to read and use. It cannot be searched, does not show when an account last signed in, and cannot change a display name.

## What Changes

- Split the page: a searchable **list** at `/staff/accounts` (name, username, role, status, last login) whose rows link to a per-account page; a **new-account page** at `/staff/accounts/new`; and a **per-account page** at `/staff/accounts/[id]` with the account fields, the archive action, and the instructor profile.
- Add a **search box** and a **Last login** column to the list.
- Let an Administrator edit an account's **display name**.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staff-account-management`: accounts are listed, created, and edited on separate pages, with search, a last-login column, and display-name editing.

## Impact

- **Services**: a `getStaffAccount` lookup; `listStaffAccounts` gains a search term and `lastLoginAt`; `updateStaffAccount` gains `displayName`.
- **UI**: a reworked accounts list, a new-account page, and a per-account detail page.
- **No schema changes**; no change to authentication or role enforcement.

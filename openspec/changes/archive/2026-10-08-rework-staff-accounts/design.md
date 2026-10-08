## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- `/staff/accounts` renders `AccountControls`: a create form, then one unstyled `.account-profile` block per account containing an inline update form (role, status, password), a separate archive form, and a full `ProfileForm`. There is no card styling and no per-account page.
- `listStaffAccounts` returns every non-archived account with `roleCode`, but not `lastLoginAt`, and takes no search term.
- `updateStaffAccount` supports `roleCode`, `isActive`, and `password` — not `displayName`.
- `createStaffAccount`/`updateStaffAccount` are driven by one `accountAction` that switches on an `operation` field.

## Goals / Non-Goals

**Goals:**
- A readable, searchable list with a last-login column, and separate create and per-account pages.
- Display-name editing on the account page.

**Non-Goals:**
- Changing authentication, roles, or the archive rules.
- Bulk actions or pagination (the staff list is small).
- Moving instructor-profile editing off the account page (it stays on the detail page).

## Decisions

### Decision: Three routes under /staff/accounts

- `/staff/accounts` — the searchable list; rows link to the account; a "New staff account" link.
- `/staff/accounts/new` — the create form (moved off the list).
- `/staff/accounts/[id]` — the account form, the archive action, and the instructor profile.

All three require Administrator access, reusing the existing guard.

### Decision: List shows name, username, role, status, and last login

`listStaffAccounts` gains an optional search term (case-insensitive match on display name or username) and returns `lastLoginAt`. The list renders a table with a Status badge and a Last login cell (blank when null).

### Decision: Display name is editable on the account page

`updateStaffAccount` gains `displayName`, validated as trimmed and non-empty. The per-account page exposes it alongside role, status, and password.

### Decision: Reuse the account action

Keep the single `accountAction` (switching on `operation`) so the new-account page posts `operation=create` and the detail page posts `operation=update`. The `getStaffAccount` lookup backs the detail page.

## Risks / Trade-offs

- Display-name edits could collide with an existing name — names are not unique, so this is allowed.
- The detail page must 404 for an unknown or archived account id, mirroring the list's filtering.
- Search is a simple case-insensitive contains match; acceptable at this scale.

## Migration Plan

None. UI and query changes only; rollback by revert. No schema changes.

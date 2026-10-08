## 1. Services

- [x] 1.1 Add an optional search term and `lastLoginAt` to `listStaffAccounts`
- [x] 1.2 Add `getStaffAccount(db, actorId, id)` for the per-account page
- [x] 1.3 Add `displayName` editing to `updateStaffAccount` (trimmed, non-empty)

## 2. Pages

- [x] 2.1 Rework `/staff/accounts` into a searchable list (name, username, role, status, last login) with a "New staff account" link
- [x] 2.2 Add `/staff/accounts/new` with the create form (moved off the list)
- [x] 2.3 Add `/staff/accounts/[id]` with the account form (display name, role, status, password), the archive action, and the instructor profile

## 3. Verification

- [x] 3.1 Add tests for search, last-login listing, `getStaffAccount`, and display-name editing
- [x] 3.2 Run `npm run check`, `npm run test`, and `npm run test:integration`

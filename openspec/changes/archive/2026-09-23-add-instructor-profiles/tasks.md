## 1. Data model

- [x] 1.1 Add nullable `ffn`, `instructor_level`, and `ems_provider_number` columns to `users`
- [x] 1.2 Add the FFN format check, the level `1|2|3` check, and a unique index on FFN where not null
- [x] 1.3 Generate and apply the migration; confirm no backfill is required

## 2. Profile services

- [x] 2.1 Add a profile read service returning the current user's profile attributes
- [x] 2.2 Add a self-service profile update that derives the target from the session and accepts only the three profile attributes
- [x] 2.3 Add an Administrator profile update that accepts an explicit target user
- [x] 2.4 Reject duplicate FFN and invalid levels with clear errors
- [x] 2.5 Write an audit event for each profile change (actor, target, changed attributes)

## 3. UI

- [x] 3.1 Add a self-service profile page reachable from staff workspaces
- [x] 3.2 Add a profile editor to the Administrator staff account screen
- [x] 3.3 Surface validation and duplicate-FFN errors in both editors

## 4. Verification

- [x] 4.1 Unit tests for profile validation, FFN uniqueness, and self-edit scoping
- [x] 4.2 Integration tests for self-edit versus Administrator edit and audit records
- [x] 4.3 Browser coverage for the profile page and the Administrator editor
- [x] 4.4 Run `npm run check` and `npm run build`

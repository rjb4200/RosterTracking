## 1. Schema and permissions

- [x] 1.1 Add nullable `archived_at` (archived implies inactive) to `agencies`, `training_sites`, `training_codes`, and `curricula`, with a migration
- [x] 1.2 Add a `curricula.manage` permission and grant it to the roles that hold the other catalog-management permissions (seed + migration)

## 2. Services

- [x] 2.1 Add archive operations and archived-aware list filters for the four catalogs (management lists hide archived; pickers keep filtering active)
- [x] 2.2 Make agency and site creation reactivate an inactive match and revive an archived match by name
- [x] 2.3 Make training-code and curriculum imports revive/reactivate matching entries and archive entries dropped from the imported list

## 3. Management screens

- [x] 3.1 Add deactivate/reactivate/archive actions to the training-codes management screen and hide archived rows
- [x] 3.2 Add a curricula management screen (list + state actions) at `/staff/curricula`, gated by `curricula.manage`
- [x] 3.3 Add archive actions and archived-hiding to the agencies and sites screens
- [x] 3.4 Add a Curricula entry to the staff navigation

## 4. Verification

- [x] 4.1 Add unit/integration tests for the state transitions, revive/reactivate on re-add, archive-on-import, and archived records being hidden from lists and pickers
- [x] 4.2 Run `npm run check`, `npm run test`, and `npm run test:integration`

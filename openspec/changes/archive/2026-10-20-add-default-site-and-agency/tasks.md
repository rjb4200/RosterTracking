## 1. Schema and migration

- [x] 1.1 Add `is_default` to `training_sites` and `agencies`, with a partial unique index per table and a check that a default is active
- [x] 1.2 Generate the forward-only migration and confirm it adds both columns, both indexes, and both checks

## 2. Reference services

- [x] 2.1 Accept the default flag on site and agency create/update and clear the previous default in the same transaction
- [x] 2.2 Restrict setting or clearing a default to Administrators in the server action and reject a non-administrator submission
- [x] 2.3 Refuse to deactivate or archive a site or agency while it is the default
- [x] 2.4 Include the default flag in site and agency list/get queries and expose the current default name for the forms
- [x] 2.5 Audit default changes with the previous and new default

## 3. Reference data UI

- [x] 3.1 Add the “Default for new classes” checkbox and inline replace/clear warning to `SiteForm` and `AgencyForm`, gated by a `canSetDefault` prop
- [x] 3.2 Pass administrator status and the current default name on the standalone New and Edit site/agency pages
- [x] 3.3 Hide the default checkbox in the class wizard’s inline site and agency dialogs
- [x] 3.4 Show a “Default” badge on the Sites and Agencies lists
- [x] 3.5 Hide the Deactivate and Archive actions while a record is the default and explain that the default must be cleared first

## 4. Class creation

- [x] 4.1 Return the default training site and host agency IDs from `listClassFormOptions`
- [x] 4.2 Initialize the class creation wizard’s site and agency fields from those defaults, leaving each field blank when unset

## 5. Tests

- [x] 5.1 Add integration coverage for setting, replacing, and clearing each default independently
- [x] 5.2 Add integration coverage for the administrator restriction, audit events, and deactivate/archive guards
- [x] 5.3 Add browser coverage for the checkbox, inline warning, list badges, lifecycle guards, and wizard preselection

## 6. Verification

- [x] 6.1 Run `npm run check`, `npm run test`, and `npm run build`
- [x] 6.2 Run the site, agency, and class-creation browser suites
- [x] 6.3 Run `openspec validate add-default-site-and-agency --strict`

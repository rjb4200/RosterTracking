## Why

Instructors re-select the same training site and host agency for almost every class. Leaving both fields blank invites inconsistent choices and extra work, while a per-user or per-class-type rule would add complexity the department does not need.

## What Changes

- Add an `is_default` flag to training sites and to agencies. The two defaults are independent: a site can be the default without an agency default, and vice versa.
- Add an Administrator-only “Default for new classes” checkbox to the standalone New and Edit forms for sites and agencies. The checkbox is not shown in the class wizard’s inline site/agency dialogs.
- Enforce at most one default site and one default agency. Saving a new default clears the previous default in the same transaction. Unchecking the current default leaves no default.
- Show an inline warning before saving when the action would replace or clear the current default.
- Block deactivating or archiving a record while it is the default. The record must have its default flag cleared first.
- Preselect the default training site and the default host agency in the class creation wizard. If either default is unset, that field starts blank; there is no recent-value or other fallback.
- Show a “Default” badge on the Sites and Agencies lists.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-management`: adds the default training site flag, its Administrator-only control, exclusivity, warning, and deactivate/archive guard.
- `agency-management`: adds the default host agency flag, its Administrator-only control, exclusivity, warning, and deactivate/archive guard.
- `class-creation-wizard`: preselects the configured default site and agency when creating a class, without a fallback.

## Impact

- Schema: `training_sites.is_default` and `agencies.is_default`, with partial unique indexes and an active-state check.
- Reference services and forms: site/agency create and update, deactivate, archive, and list queries.
- Class form options and the class creation wizard initial values.
- Unit, integration, and browser coverage for defaults, exclusivity, warnings, lifecycle guards, and wizard preselection.
- No new settings table, no per-user defaults, and no change to class validation or stored class data.

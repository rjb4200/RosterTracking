## Why

The staff area has one generic landing page and permission-filtered navigation, so Instructors, Training Majors, and Administrators do not receive workflows suited to their work. Administrators also need to create and manage staff accounts without relying on operator commands.

## What Changes

- Route staff from `/staff` to an account-level workspace based on active role assignments.
- Add an Instructor workspace focused on accessible classes, QR/sign-in operations, rosters, finalization, and previously taught classes.
- Add an Admin workspace for Training Majors and Administrators, focused on administration, reporting, finalized classes, and reference data.
- Retain current shared operational routes under `/staff` while presenting workspace-specific navigation and landing pages.
- Add Administrator-only staff account creation and management with Instructor, Training Major, and Administrator role choices.
- Keep existing permission checks and domain-specific role authority as the authorization source of truth.

## Capabilities

### New Capabilities

- `staff-workspaces`: Role-aware staff landing pages and navigation for Instructor and Admin workflows.
- `staff-account-management`: Administrator-only account creation and lifecycle management.

### Modified Capabilities

- `staff-authentication`: Login routing and account administration behavior.

## Impact

- Affected code: staff authorization, protected layouts, login redirect, workspace routes, navigation, staff-account services/actions, and tests.
- Existing `/staff/classes`, `/staff/reporting`, and other operational URLs remain valid.
- No permission grants, role data model, or server-side authorization rules are weakened.

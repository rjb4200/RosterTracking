## Why

Class creation and student sign-in depend on reusable reference data (students, agencies, credentials, courses, sites, and reporting requirements). Building this data layer and its administration now gives later phases a stable, searchable foundation instead of hard-coded forms.

## What Changes

- Add reference-data tables and a reviewed migration: students, agencies, student-agency memberships, credential types, student credentials, reporting systems, versioned reporting requirement sets, reporting requirements, training codes, courses, course reporting defaults, and training sites.
- Seed credential types (FFN, KEMSIS ID, NREMT, FEMA SID), reporting systems (fire, kbems, fema), and version-1 reporting requirements (fire → FFN, kbems → KEMSIS ID, fema → FEMA SID).
- Add reference-data permissions (`students.manage`, `agencies.manage`, `courses.manage`, `sites.manage`, `reporting.manage`, `sites.create`) and grant them to administrator and training-major roles.
- Add server-side domain services with zod validation, masked credential display, and audit events.
- Add searchable admin screens for students, agencies, credentials, courses, training codes, and sites using shadcn/ui.
- Add an idempotent training-code import command; the actual Fire Commission code data is imported later from a structured source (no CSV is available yet).
- Defer student sign-in, classes, attendance, finalization, reporting workflow, and roster generation to later phases.

## Capabilities

### New Capabilities

- `students`: Student records with unique phone lookup, optional internal number, and multiple agency memberships with a single primary; searchable administration and audit trail.
- `credentials`: Data-driven credential types and per-student credential values stored with a masked display suffix and never shown in full in normal UI.
- `reporting-requirements`: Data-driven reporting systems with versioned requirement sets that map systems to the credentials and student fields they require.
- `course-catalog`: Fire training codes, reusable courses, and training sites, searchable and managed by administrators.

### Modified Capabilities

None.

## Impact

- Adds a database migration, seed data, domain modules, admin UI routes, the shadcn/ui dependency, and tests.
- Grants new permissions to the administrator and training-major roles and `sites.create` to instructors.
- Establishes server actions and a server-only data access layer for reference-data mutations.
- Does not change the existing staff authentication or authorization model.

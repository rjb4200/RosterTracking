## 1. Foundation and shadcn/ui

- [x] 1.1 Install and configure shadcn/ui (init, base components: button, input, label, table, dialog, badge, select)
- [x] 1.2 Add a server-only data access layer and `"use server"` action convention for reference-data mutations

## 2. Schema, migration, and seed

- [x] 2.1 Define reference-data schema (students, agencies, student_agencies, credential_types, student_credentials, reporting_systems, reporting_requirement_sets, reporting_requirements, training_codes, courses, course_reporting_defaults, training_sites)
- [x] 2.2 Generate and review the additive migration with foreign keys, unique/partial indexes, and check constraints
- [x] 2.3 Add an idempotent reference-data seed for credential types, reporting systems, and version-one requirement sets (fire→FFN, kbems→KEMSIS ID, fema→FEMA SID)

## 3. Permissions and domain services

- [x] 3.1 Add reference-data permissions and grant administrator/training-major access plus instructor `sites.create`
- [x] 3.2 Implement students and agencies services (create/update/deactivate, membership with single primary, search) with audit events
- [x] 3.3 Implement credentials service (masked suffix, one active per type, uniqueness) with audit events
- [x] 3.4 Implement reporting-requirements resolution service and course/site services with audit events
- [x] 3.5 Implement idempotent training-code import command

## 4. Administrative UI

- [x] 4.1 Students list/search and student create/edit screens with agency memberships
- [x] 4.2 Credentials management within student detail (masked display)
- [x] 4.3 Agencies list/search and create/edit screens
- [x] 4.4 Courses and training codes list/search and create/edit screens
- [x] 4.5 Training sites list/search and create/edit screens
- [x] 4.6 Protected admin navigation linking the reference-data screens

## 5. Tests and verification

- [x] 5.1 Unit tests for credential masking, membership primary, and reporting-requirement resolution
- [x] 5.2 Integration tests for migration and seed idempotency and reference-data CRUD
- [x] 5.3 Playwright smoke coverage for the student and course admin screens
- [x] 5.4 Run lint, typecheck, unit/integration/E2E tests, migration check, and production build; resolve all failures

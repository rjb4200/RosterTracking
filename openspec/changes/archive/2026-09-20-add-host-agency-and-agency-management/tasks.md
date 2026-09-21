## 1. Data model

- [x] 1.1 Add `contact_name`, `phone`, and `email` columns to `agencies` in the Drizzle schema
- [x] 1.2 Add a functional unique index on `lower(btrim(name))` for agencies
- [x] 1.3 Add nullable `host_agency_id` to `classes` referencing `agencies` with restrict delete
- [x] 1.4 Generate the reviewed SQL migration and confirm the backfill ordering

## 2. Rollout data

- [x] 2.1 Pre-flight report: duplicate agency names and classes lacking a host agency
- [x] 2.2 Create the Winchester Fire Department agency if absent
- [x] 2.3 Backfill existing classes with a host agency, add the foreign key, enforce NOT NULL
- [x] 2.4 Rehearse migration and rollback on a Neon branch

## 3. Agency management

- [x] 3.1 Extend the agency create/edit service and form with contact name, phone, and email
- [x] 3.2 Validate email format and enforce case-insensitive unique names with a clear duplicate error
- [x] 3.3 Grant `agencies.manage` to the instructor role and update the permission seed
- [x] 3.4 Confirm no agency delete action exists in any service or UI

## 4. Class host agency

- [x] 4.1 Add the Host Agency step to the class creation wizard
- [x] 4.2 Add an inline "Add agency" affordance on the Host Agency step
- [x] 4.3 Persist the host agency on create and include it in the review summary
- [x] 4.4 Require an active host agency before a class can be opened
- [x] 4.5 Show and allow editing the host agency on the class detail view

## 5. Sign-in agency resolution

- [x] 5.1 Relax regular agency validation to accept any active catalog agency
- [x] 5.2 Preselect the host agency when the identified student belongs to it
- [x] 5.3 Offer memberships plus the active catalog when the student does not belong to the host agency
- [x] 5.4 Keep guest selection on the active catalog list

## 6. Verification

- [x] 6.1 Integration tests: host-agency requirement, name uniqueness, catalog fallback acceptance
- [x] 6.2 E2E test: instructor adds an agency inline during class setup and uses it
- [x] 6.3 E2E test: a regular student with no memberships completes sign-in
- [x] 6.4 Confirm documentation and `ARCHITECTURE.md` reflect the single-catalog decision

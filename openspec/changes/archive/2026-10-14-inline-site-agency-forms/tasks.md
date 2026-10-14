## 1. Reference services resolve existing names

- [x] 1.1 `createAgency`: when the name matches an existing active agency, return that agency unchanged instead of inserting or erroring.
- [x] 1.2 `createSite`: when the name matches an existing active site, return that site unchanged instead of inserting.
- [x] 1.3 Keep the archived/inactive revive path (overwrite) unchanged for both.

## 2. Training-site unique name

- [x] 2.1 Add a case/whitespace-insensitive unique index on `training_sites` name in the schema.
- [x] 2.2 Generate the migration; detect and resolve any existing duplicate active site names before applying.

## 3. Inline popup forms

- [x] 3.1 Add an optional `onCreated` callback to `AgencyForm` and `SiteForm` (additive; admin pages unchanged).
- [x] 3.2 Replace the wizard's inline name inputs with "Add a new site" / "Add a new agency" buttons that open a `Dialog`.
- [x] 3.3 Render `SiteForm` / `AgencyForm` in the dialog wired to the inline create actions; the name is required, other fields optional.
- [x] 3.4 On success, add the returned record to the wizard's options, select it, and close the dialog.

## 4. Page wiring

- [x] 4.1 Load the active agency tags in the class-creation page and pass them to the wizard for the agency dialog.

## 5. Tests

- [x] 5.1 Service tests: creating a site/agency with an active name returns the existing record; an archived name revives it.
- [x] 5.2 E2E: add a site and an agency through the popup with details, and confirm a name match reuses the existing record.

## 6. Verification

- [x] 6.1 Run lint, typecheck, unit and integration suites, and the build.
- [x] 6.2 Run the affected Playwright specs.

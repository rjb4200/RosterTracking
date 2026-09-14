## 1. Delivery Data Migration

- [x] 1.1 Add a database migration that validates legacy delivery values, converts `in_person` to `classroom` and `virtual` to `online`, preserves `hybrid`, and replaces the delivery and training-site constraints.
- [x] 1.2 Update delivery constants, validation, class queries, public listings, fixtures, and display labels to use Classroom, Hands-On, Online, and Hybrid.
- [x] 1.3 Add migration and policy tests for every delivery value and its site requirement.

## 2. Creation Services

- [x] 2.1 Extend class-creation option queries with training-code metadata, active reporting requirements, and actor-scoped recent courses and sites.
- [x] 2.2 Add a transaction-backed creation operation that creates the class, first scheduled component, reporting selections, and lead assignment while preserving permission checks and audit logging.
- [x] 2.3 Add an authorized inline site-creation action that returns a selectable site without exposing reference-data writes to unauthorized staff.
- [x] 2.4 Add service tests for atomic rollback, selected-reporting requirement unions, recent-option scope, and inline site authorization.

## 3. Guided Creation Experience

- [x] 3.1 Replace the one-page class form with a responsive, accessible Course, Training Site, Class Details, Reporting, and Review wizard that preserves values across navigation.
- [x] 3.2 Implement searchable course and site controls, recent selections, course defaults, and inline site creation within the wizard.
- [x] 3.3 Collect initial date, start time, credited duration, delivery method, and lead instructor in Class Details; apply delivery-specific site guidance.
- [x] 3.4 Display selected reporting destinations' required student credentials and fields in the Reporting and Review steps.
- [x] 3.5 Submit the review step through the atomic creation action and direct the user to the created draft when successful.

## 4. Verification

- [x] 4.1 Add E2E coverage for wizard completion, backward navigation with retained values, search and inline-site paths, reporting-requirement visibility, and final draft creation.
- [x] 4.2 Run formatting, linting, type checks, unit and integration tests, migration verification, and relevant E2E tests.

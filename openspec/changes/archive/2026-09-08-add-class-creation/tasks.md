## 1. Schema and authorization

- [x] 1.1 Define class, component, instructor-assignment, and reporting-selection schema with delivery and lifecycle checks, foreign keys, search indexes, and a single-lead-instructor partial unique index.
- [x] 1.2 Generate and review the additive class-creation migration.
- [x] 1.3 Add class-management permissions and grants for instructors, Training Majors, and administrators.

## 2. Class domain services

- [x] 2.1 Add server-only class services to create and update drafts with course, site, delivery, and reporting-system validation.
- [x] 2.2 Add component and instructor-assignment services that enforce scheduled ranges and a single lead instructor.
- [x] 2.3 Add lifecycle transition services that enforce draft-to-open, open-to-completed, cancellation, ownership, and audit rules.
- [x] 2.4 Apply course reporting defaults when a draft is created and retain staff-selected reporting-system changes.

## 3. Sign-in access

- [x] 3.1 Add token generation, hashing, lookup, and rotation services without persisting raw tokens or logging token material.
- [x] 3.2 Add the state-limited public token-resolution route and generic unavailable response.
- [x] 3.3 Add QR-code generation for newly created or rotated sign-in URLs.

## 4. Staff UI

- [x] 4.1 Add permission-gated class navigation and class list/search pages.
- [x] 4.2 Implement the stepped class-creation wizard with durable draft saves, catalog selection, components, instructor assignments, and reporting selections.
- [x] 4.3 Add class detail and edit screens with lifecycle controls and validation feedback.
- [x] 4.4 Show the newly generated or rotated sign-in URL and QR code without exposing previously generated raw tokens.

## 5. Tests and verification

- [x] 5.1 Add unit tests for lifecycle validation, delivery/site rules, component ranges, lead-instructor selection, and token hashing.
- [x] 5.2 Add integration tests for migrations, class CRUD, lifecycle constraints, reporting defaults, token rotation, and audit events.
- [x] 5.3 Add Playwright coverage for authorized draft creation, opening a complete class, and unavailable public token access.
- [x] 5.4 Run lint, typecheck, unit/integration/E2E tests, migration check, and production build; resolve all failures.

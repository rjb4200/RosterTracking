## 1. Role-Aware Authorization

- [x] 1.1 Extend current-staff resolution with active role codes while preserving effective permission unions.
- [x] 1.2 Add workspace-resolution helpers with Administrator/Training Major precedence over Instructor.
- [x] 1.3 Add unit tests for role loading, workspace routing, and retained multi-role behavior.

## 2. Workspace Routing And Navigation

- [x] 2.1 Route `/staff` to the resolved Instructor or Admin workspace and update post-login navigation.
- [x] 2.2 Add Instructor and Admin workspace pages that link to shared operational routes with role-appropriate focus.
- [x] 2.3 Update the protected shell to present workspace context and navigation without weakening shared-route authorization.
- [x] 2.4 Add route and navigation tests for Instructor, Training Major, Administrator, and direct shared-route access.

## 3. Administrator Account Management

- [x] 3.1 Add Administrator-role authorization helpers and protected staff-account queries that omit password hashes.
- [x] 3.2 Add account creation, role replacement, activation, and password-reset services with audit events and session invalidation.
- [x] 3.3 Protect the final active Administrator from deactivation or Administrator-role removal.
- [x] 3.4 Add Administrator-only staff-account pages, forms, and actions with all three role choices.
- [x] 3.5 Add service and UI tests for authorization, validation, audit safety, role changes, and session invalidation.

## 4. Verification

- [x] 4.1 Run lint, typecheck, relevant unit/integration/E2E tests, and a production build.
- [x] 4.2 Validate the OpenSpec change and update completed task checkboxes.

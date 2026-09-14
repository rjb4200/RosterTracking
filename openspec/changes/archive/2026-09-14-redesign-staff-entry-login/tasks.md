## 1. Public Entry Experience

- [x] 1.1 Redesign the public landing page around distinct Instructor and Training Administration entry paths with class-QR student guidance.
- [x] 1.2 Add responsive, accessible styles for the revised entry map and preserve the established Roster Command visual language.

## 2. Purpose-Specific Login Surfaces

- [x] 2.1 Add `/instructor/login` and `/admin/login` pages with distinct workflow-specific copy, metadata, and visual treatment.
- [x] 2.2 Reuse the existing credentials form and direct every successful login through `/staff` for server-side role-aware workspace routing.
- [x] 2.3 Preserve `/staff/login` as a compatible redirect or staff-entry guide for existing links and protected-route redirects.

## 3. Verification

- [x] 3.1 Add route and login-form tests for both entry paths, legacy compatibility, shared credential behavior, and role-aware post-login routing.
- [x] 3.2 Verify responsive keyboard and narrow-viewport behavior for the landing page and both login surfaces.
- [x] 3.3 Run lint, typecheck, relevant unit/E2E tests, and a production build.

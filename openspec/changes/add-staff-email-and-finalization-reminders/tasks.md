## 1. Data model and migrations

- [x] 1.1 Add a nullable, normalized `email` column to `users` with a partial case-insensitive unique index and a normalization check in `src/server/db/schema/auth.ts`.
- [x] 1.2 Extend `email_deliveries` to represent a scheduled message addressed to a staff account for a period (recipient account reference plus a period/dedupe key and its unique index) in `src/server/db/schema/notifications.ts`, leaving the existing participant delivery identity intact.
- [x] 1.3 Generate the forward-only migration for both changes and confirm the existing certificate delivery queries are unaffected.

## 2. Staff email identity

- [x] 2.1 Add a shared `normalizeEmail` (trim, lower-case, validate) beside the existing username normalization in `src/modules/staff-auth`.
- [x] 2.2 Update `authenticateStaff` to route an identifier containing `@` to account-email lookup and otherwise keep the username path, performing the same dummy-hash verify on a miss and preserving lockout and session-version behavior.
- [x] 2.3 Accept an optional email in account creation, enforce uniqueness in the service, and record it in the audit trail in `src/modules/staff-auth/staff-accounts.ts`.
- [x] 2.4 Add an email column to the account row type and account listing/search, and allow setting or changing the email from the per-account edit path.
- [x] 2.5 Add the email to the self-service profile contract and update path in `src/modules/staff-auth/profiles.ts` and `profile-contract.ts`, recording changes in the audit trail.
- [x] 2.6 Include `email` in `CurrentStaff` and `getCurrentStaff` so the shell can read it.
- [x] 2.7 Add the email field to the account create form, the per-account edit form, and the profile form, and show the email (or its absence) in the account list.
- [x] 2.8 Change the login form label and copy to accept a username or email.

## 3. Missing-email prompt

- [x] 3.1 Render a persistent prompt in the protected staff layout when the signed-in account has no email, linking to `/staff/profile`, shown for every staff role and hidden once an email is set.

## 4. Reminder domain

- [x] 4.1 Add a query for overdue open classes (still open, final scheduled end more than 24 hours ago) storing each class's signing instructor.
- [x] 4.2 Add a signing-instructor resolver that returns the signing instructor and falls back to the lead, ready to adopt the fire-instructor rules when `add-assistant-instructors` lands.
- [x] 4.3 Group the overdue set by recipient account, skipping accounts with no email or an inactive account.
- [x] 4.4 Add a branded reminder digest template listing each class's name, scheduled date, and review-screen link in `src/modules/notifications/templates.ts`.
- [x] 4.5 Record one digest delivery per recipient and department calendar day, suppressing a duplicate for the same day, and send through the shared Resend sender.

## 5. Scheduled endpoint

- [x] 5.1 Add `/api/cron/class-reminders` that rejects a request missing the configured schedule authorization and performs no sending outside the live production environment.
- [x] 5.2 Add `CRON_SECRET` to the server environment schema with a development-safe default and document it in `.env.example`.
- [x] 5.3 Declare the daily cron entry in `vercel.json` pointing at the reminder route.

## 6. Tests

- [x] 6.1 Test email normalization, uniqueness (case-insensitive), and clearing.
- [x] 6.2 Test login by username, by email, by differently-cased email, and rejection of an unknown identifier.
- [x] 6.3 Test that the missing-email prompt appears without an email and disappears once set.
- [x] 6.4 Test the overdue threshold boundary (exactly 24 hours versus more than 24 hours).
- [x] 6.5 Test digest grouping (one digest per instructor listing multiple classes) and audience selection with the lead fallback.
- [x] 6.6 Test idempotency (a second run on the same day sends nothing), stop-on-finalize, stop-on-cancel, and resume-on-reopen.
- [x] 6.7 Test that a recipient with no email or an inactive account is skipped without failing the run.
- [x] 6.8 Test that the reminder route rejects an unauthorized request and sends nothing outside production.

## 7. Verification

- [x] 7.1 Run `npm run check` and `npm run test`.
- [x] 7.2 Run `npm run verify` and resolve any failures.
- [x] 7.3 Confirm `openspec validate add-staff-email-and-finalization-reminders` passes.

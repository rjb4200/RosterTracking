## Why

A class that has ended more than 24 hours ago but is still open is only surfaced on a dashboard an instructor may not revisit, so rosters can sit unfinalized indefinitely. A daily email digest to the person who can actually finalize the class — the signing instructor — closes that loop. Reminders need two things the system does not have: an email address on staff accounts, and any way to run work on a schedule.

## What Changes

- Add an optional email to staff accounts, normalized and unique, set by Administrators and maintainable by the account owner from their profile.
- Allow staff to sign in with either their username or their account email.
- Prompt an account that has no email to add one from the staff area.
- Add a daily scheduled job that emails each signing instructor a digest of their open classes whose scheduled end passed more than 24 hours ago, repeating daily until each class is finalized or cancelled; a reopened past class resumes appearing.
- Deliver reminders through the existing Resend sender and `noreply@winchesterfireems.com`, recorded in the shared email outbox, which gains the ability to represent a scheduled digest addressed to an account rather than a participant.
- Run reminders only in production so development and preview environments never email.

## Capabilities

### New Capabilities

- `staff-email`: the optional account email on staff accounts — its normalization and uniqueness, maintenance by its owner and by Administrators, use as an alternate login identifier, and the prompt shown when it is missing.
- `class-finalization-reminders`: the daily digest of overdue open classes sent to the signing instructor, including the trigger threshold, cadence, stop and resume conditions, scheduled execution, and idempotent delivery.

### Modified Capabilities

- `staff-authentication`: staff login accepts an account email in place of the username.
- `staff-account-management`: Administrators can set and change an account email and see it in the account list.
- `email-delivery`: the shared outbox and sender also carry scheduled digest messages addressed to an account, in addition to the existing per-participant messages.

## Impact

- **Data**: `users` gains a nullable, normalized, case-insensitively unique `email`; `email_deliveries` gains the keys needed to record a digest addressed to an account and its period. Both are forward-only migrations.
- **Authentication**: `authenticateStaff` (`src/modules/staff-auth/authentication.ts`) routes an identifier containing `@` to email lookup and otherwise keeps the username path; `CurrentStaff`/`getCurrentStaff` gain the email; the login copy and label change from "Username" to allow either.
- **Account management**: account create, edit, and list (`src/modules/staff-auth/staff-accounts.ts`, the account pages) include the email.
- **Profile**: the self-service profile form and contract gain the email.
- **Staff shell**: the protected staff layout (`src/app/staff/(protected)/layout.tsx`) presents the missing-email prompt.
- **Reminders**: a new overdue-class query reusing `isOverdueRoster` (`src/modules/classes/services.ts:105`), a signing-instructor resolver with a lead fallback (aligned with the in-progress `add-assistant-instructors` change), a branded digest template, and a `/api/cron/class-reminders` route protected by `CRON_SECRET` and declared in `vercel.json`.
- **Environment**: `CRON_SECRET` joins the server environment; the job no-ops outside production.
- **No breaking changes**: the email is optional, and username login continues to work.
- **Tests**: email login and uniqueness, the missing-email prompt, the reminder threshold and grouping, digest idempotency, stop-on-finalize, resume-on-reopen, and production-only gating.

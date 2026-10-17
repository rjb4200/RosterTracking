## Context

The system already defines an overdue roster as an open class whose final scheduled end passed more than 24 hours ago (`isOverdueRoster`, `src/modules/classes/services.ts:105`) and already surfaces overdue rosters on the instructor workspace. What is missing is a way to reach the instructor who can finalize the class, and a way to run work on a schedule.

Two facts constrain the design:

- Staff accounts (`users`) have no email address, and usernames cannot contain `@` (`normalizeUsername`, `src/modules/staff-auth/password.ts`). There is nowhere to send a reminder and no alternate login identifier.
- The app has no scheduler; every outbound email today is triggered by a user action, and `email_deliveries` is keyed to one participant per source (`src/server/db/schema/notifications.ts:63`), which does not describe a digest that spans many classes.

The email pipeline (Resend sender, branded shell, inline logo) is reusable as-is.

## Goals / Non-Goals

**Goals:**

- Give every staff account an optional, normalized, unique email that Administrators can set and the owner can maintain.
- Let staff sign in with either their username or their account email.
- Nudge accounts without an email to add one.
- Send the signing instructor a daily digest of their overdue open classes, until each is finalized or cancelled, resuming when a class is reopened.
- Keep reminder delivery inside the shared sender and the durable, auditable email ledger, and never email from non-production environments.

**Non-Goals:**

- Verifying email addresses (no double opt-in), and no password reset by email.
- Auto-finalizing or auto-locking classes; reminders only prompt a human.
- Emailing assisting instructors who cannot finalize.
- Changing the overdue threshold or the existing dashboard behavior.
- Escalation paths beyond the signing instructor (a later change may add a Training Major digest).

## Decisions

### Email is an account field, optionally owner-maintained

`users.email` is added nullable, trimmed, lower-cased, and constrained to be case-insensitively unique (partial index where not null). It is an account-level identifier like `username`, so it is created and corrected through account management, but the owner may also edit it from their profile. The existing "account fields and profile fields are maintained separately" rule is extended to describe email as an account field the owner may also maintain, rather than reclassifying it as a profile attribute.

Alternative considered: keep email only admin-managed. Rejected because the missing-email prompt is only useful if the owner can act on it without an Administrator.

### Login routes by the presence of `@`

`authenticateStaff` inspects the submitted identifier: if it contains `@`, it is normalized and matched against `users.email`; otherwise the existing username path runs. Because usernames cannot contain `@` and emails always do, the two namespaces cannot collide and no precedence rule is needed. Both miss paths still perform the dummy-hash verify so timing and enumeration behavior are unchanged. Lockout and session-version checks remain account-scoped.

Alternative considered: try username first, then email. Rejected as it allows a username to shadow an email and complicates the "unknown account" timing.

### Reuse the outbox with a digest key

The durable ledger principle ("one place for message generation, delivery records, and resending") is preserved by extending `email_deliveries` to represent a message addressed to an account for a period, rather than introducing a second ledger. Concretely, the row gains an optional recipient account reference and a dedupe key unique per `(recipient, period, template)`. Existing certificate rows keep their current identity. A failed digest is retryable and an already-sent digest for the same period is suppressed.

Alternative considered: a dedicated `class_reminder_digests` table. Rejected because it would create a second delivery ledger and diverge from the audited one.

### One digest per instructor per department day

The job re-derives the overdue set on every run and groups it by the signed-in instructor, then writes one delivery per instructor for the current department calendar date. Dashes of repeated reminders are naturally bounded by that key, so a re-run is idempotent. Reopening a class simply lets it reappear in the next day's digest; no per-class reminder state is required.

Alternative considered: per-class emails. Rejected as noisy and harder to dedupe.

### Scheduled by Vercel Cron, production-only

A `/api/cron/class-reminders` route is declared in `vercel.json` and protected by `CRON_SECRET`. The route rejects requests without the matching authorization header and no-ops unless the environment is the live production environment, so previews and development cannot email anyone.

Alternative considered: an external scheduler. Rejected as unnecessary infrastructure for a single daily job on Vercel.

### Signing instructor, with a lead fallback

The audience resolver returns the signing instructor — the lead, or the assistant when the in-progress `add-assistant-instructors` change says the assistant signs — and falls back to the lead when no signing instructor resolves. Until that change lands, the resolver returns the lead. Reminders therefore target the person who can act today and continue to be correct afterward.

### Missing or inactive recipients are skipped, not escalated

If the resolved instructor has no email, or the account is inactive, no reminder is sent; the missing-email prompt covers the first case. Escalation to Training Majors is deliberately deferred.

## Risks / Trade-offs

- **Staff emails are unverified.** A typo means a bounced reminder and a failed email login, while username login still works. Mitigation: reuse the existing recipient validation and surface the email on the account list so Administrators can spot mistakes; add verification before any password-reset feature.
- **Dev and preview must never email.** A cron route that inherits production env vars in preview is the main hazard. Mitigation: gate execution on the production environment discriminator and on the presence of the sender key.
- **DST shifts the local send time.** A fixed UTC schedule drifts by an hour seasonally. Mitigation: accept the drift initially; a "local morning only" guard can be added later.
- **Reopened classes can look like repeat spam.** A reopened past class returns to the digest the next day. Mitigation: this is intentional and bounded to one digest per instructor per day.
- **Outbox extension touches the certificate path.** The identity change must not alter existing certificate dedupe. Mitigation: keep the existing participant key intact and add the account/period key additively, covered by the existing certificate tests.
- **Dependency on `add-assistant-instructors`.** Designing against a resolver avoids a rewrite, but the resolver's fire-instructor rules do not exist yet. Mitigation: ship the lead fallback now and wire the resolver when that change lands.
- **Reminder content is a snapshot.** The digest lists classes by their current facts; a class finalized between the query and the send is harmless because the next run drops it.

## Migration Plan

1. Add the `users.email` column and its partial unique index, and the `email_deliveries` account/period key, as forward-only migrations. Both are nullable and additive, so existing rows and the certificate path are unaffected.
2. Deploy the code (auth, account management, profile, prompt, cron route, template) with no cron schedule yet and no `CRON_SECRET`.
3. Set `CRON_SECRET` and add the `vercel.json` cron entry, then deploy production and confirm one digest run.
4. Rollback: remove the cron entry and unset `CRON_SECRET` to stop sending; the nullable columns can remain without effect.

## Open Questions

- Exact UTC cron hour and whether to add a local-morning guard now or later.
- Whether Administrators should also see an "accounts missing email" report.
- Whether an inactive signing instructor should later escalate to a Training Major.

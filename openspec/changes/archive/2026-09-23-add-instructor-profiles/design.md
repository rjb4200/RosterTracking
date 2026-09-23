## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- `users` holds `username`, `displayName`, `passwordHash`, `isActive`, and session state only (`src/server/db/schema/auth.ts`). There is no instructor credential data.
- Roles are `Instructor`, `Training Major`, `Administrator` (`staff-account-management`). Only Administrators reach account management today.
- Official output (`official-roster-pdfs/service.ts`) prints instructor **names** only. The KFS-1A template exposes `FFN`, `FFN_2`, and instructor-level checkboxes that are never populated.
- The reporting queue and finalization already write audit events through `writeAuditLog`.

## Goals / Non-Goals

**Goals:**
- Store FFN, Fire Instructor level (1/2/3), and EMS provider number on staff users.
- Give instructors a self-service profile and Administrators a full editor.
- Keep the account/profile boundary explicit so self-edit cannot escalate privileges.

**Non-Goals:**
- Not changing role or permission definitions.
- Not storing instructor credentials in the student credential tables (`student_credentials` is for students).
- Not enforcing certification-level authority (for example, blocking a Level 1 instructor from a Level 2 course); that is a future policy change.
- Not printing the values onto official documents — that is `complete-fire-roster-fields` and `add-ems-completion-certificate`.

## Decisions

### D1 — Store profile attributes on `users`
Add nullable `ffn`, `instructor_level`, and `ems_provider_number` columns to `users`.

- **Why**: one profile per staff user, no history table needed because official output snapshots the values at finalization anyway.
- **Alternatives**: a separate `instructor_profiles` table (more joins, no current benefit); reusing `student_credentials` (wrong subject; that table is keyed to students and is for reporting-required IDs).

### D2 — Format and uniqueness checks live in the database and service
FFN uses the Fire Commission eight-digit `0000-0000` form; level is constrained to `1 | 2 | 3`; FFN is unique among non-null values.

- **Why**: FFN is a printed identity used on official rosters, so a duplicate or malformed value is a reporting error, not a cosmetic one.
- **Alternatives**: free text (invites typos the roster then prints).

### D3 — Self-edit is a separate, narrowly scoped action
A profile update accepts only the three profile attributes and derives the target user from the session. It never accepts a user id, role, or status. Administrators use the same service with an explicit target user.

- **Why**: the account-management spec already says only Administrators manage accounts; making self-edit a different code path keeps that guarantee rather than relaxing it.
- **Alternatives**: a single "update user" action gated by a permission (riskier — one missed check exposes role changes).

### D4 — Audit every profile change
Record actor, target user, and the set of changed attribute names (and the new values needed to identify the change).

- **Why**: these values are printed on official documents, so provenance matters.

## Risks / Trade-offs

- **Self-edit privilege escalation** → the self-service action takes no target user and no role/status fields; covered by a test that attempts to include them.
- **Duplicate FFN across staff** → unique index on `ffn` where not null, plus a service-level conflict error.
- **Blank profile values reach official output** → output prints blank when a value is missing (handled downstream), so incomplete profiles degrade to a blank field rather than an error.
- **Level meaning drift** → constrained to `1 | 2 | 3`; if more levels appear later, widen the check in a follow-up.

## Migration Plan

1. Add the nullable columns and the FFN unique index; no backfill (existing rows stay null).
2. Ship the self-service profile page and the Administrator profile editor.
3. **Rollback**: drop the columns and index; no data depends on them yet.

## Open Questions

None blocking.

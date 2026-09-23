## Why

Official output needs instructor facts the app never stores. The KFS-1A prints each instructor's **FFN** and **certification level (1/2/3)**, and KBEMS documentation needs the instructor's **state EMS provider number**, but staff accounts only hold a username, display name, and role. Instructors also have no way to maintain their own credentials, so every correction falls to an Administrator.

## What Changes

- Add **instructor profile** attributes to staff: Fire Commission FFN, Fire Instructor certification level (1/2/3), and state EMS provider number.
- Let an **instructor edit their own profile**; let an **Administrator edit any profile**.
- Keep **account-level** fields (username, role, status, password) Administrator-only — profile editing never grants account or role changes.
- Record an audit event for each profile change without exposing the full credential values.

## Capabilities

### New Capabilities
- `instructor-profiles`: the instructor-maintained and Administrator-maintained credential attributes that official rosters and certificates depend on.

### Modified Capabilities
- `staff-account-management`: make explicit that account management covers account-level fields only, and that profile attributes are maintained separately by the profile owner or an Administrator.

## Impact

- **Schema**: `users` gains `ffn`, `instructor_level`, and `ems_provider_number` (all nullable), with a format check on FFN and a level check constrained to 1, 2, or 3.
- **Modules**: `staff-auth` (profile read/update services, permissions, audit), `staff-account-management` UI (profile section).
- **Routes/UI**: staff profile page (self-service) and an Administrator profile editor on the staff account screen.
- **Security**: self-edit is scoped to the authenticated user's own profile attributes; role/status/username remain Administrator-only. Profile values are printed on official documents, so changes are audited.
- **Downstream**: unblocks the KFS-1A instructor FFN/level fields (`complete-fire-roster-fields`) and the certificate instructor name/provider number (`add-ems-completion-certificate`).

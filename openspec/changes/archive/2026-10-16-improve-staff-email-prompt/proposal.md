## Why

The missing-email prompt shipped as a left-aligned flex row on a hard-coded off-palette background with no way to dismiss it, so it reads like debug output rather than product UI and stays in the way all session. Staff who cannot or will not add an email should still get a deliberate, clearly styled notice that they can acknowledge, returning on the next sign-in until the gap is closed.

## What Changes

- Replace the prompt with a **full-bleed colored band directly under the staff header**, above the section navigation.
- Center the message, add an alert icon, a primary **Add email** call to action, and a **dismiss** control.
- Use the existing department palette (`--signal` / `--signal-dark`) instead of the hard-coded `#fff8e6`, and drop the ad-hoc left border.
- Make the prompt **dismissible for the current sign-in only**: dismissing hides it until the next successful login, at which point it returns while the account still has no email.
- Keep the prompt for every staff role, and keep it hidden permanently once an email is stored.
- No change to the trigger (an account without an email) and no change to reminder delivery.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staff-email`: the missing-email prompt becomes a styled, full-bleed band under the staff header that is dismissible for the current sign-in and reappears on each new login until an email is set.

## Impact

- `src/app/staff/(protected)/layout.tsx` — render the band directly under the header, before the navigation.
- New prompt component plus a dismiss interaction, and `src/app/globals.css` styling (full-bleed band, `--signal` palette, centered copy, dismiss control).
- `src/modules/staff-auth/authorization.ts` — expose the per-login marker (the account's last sign-in timestamp) so a dismissal can be tied to the current login and reset on the next one.
- Depends on `add-staff-email-and-finalization-reminders` being archived first, since that change introduces the base `staff-email` requirement this one modifies.
- No database schema, email sending, or reminder changes.

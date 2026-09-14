## Context

The existing public page links only to `/staff/login`, which renders one generic credentials form. `/staff` already resolves active database roles and routes Instructors to the Instructor workspace and Training Majors or Administrators to the Admin workspace. See proposal.md and the staff-entry-experience requirements for the user-facing behavior.

## Goals / Non-Goals

**Goals:**
- Make Instructor and training-administration entry paths clear before authentication.
- Reuse the credentials authentication action, session creation, error handling, and post-login role resolution.
- Keep the legacy staff-login address usable while external bookmarks migrate.

**Non-Goals:**
- Adding public staff registration, password recovery, role selection, or role authorization in the browser.
- Adding a standalone student login or manual class-code entry; student attendance remains class-context and QR driven.
- Changing protected workspace authorization or staff account management.

## Decisions

### Use two purpose-specific routes with a shared login form

`/instructor/login` and `/admin/login` will render distinct page shells, copy, metadata, and responsive styling while sharing one credentials form component and authentication submission path.

This avoids duplicated credential handling and guarantees consistent invalid-credential and disabled-account behavior. Separate form implementations were rejected because they would drift in validation, error handling, and future authentication updates.

### Keep `/staff` as the sole post-auth destination

Every successful login will navigate to `/staff`, which resolves the active server-side roles and selects the appropriate workspace.

This ensures that an Administrator using the Instructor-facing page still reaches the Admin workspace, and an Instructor using the administrative page cannot obtain administrative access. Hard-coding different destinations per login page was rejected because the selected entry path is not an authorization decision.

### Make the landing page an entry map, not a student-login form

The landing page will expose Instructor and Training Administration paths and give students clear QR-code guidance. It will not link a visitor to the context-dependent student attendance wizard without a class token.

Adding manual class-code entry is intentionally deferred because it changes the attendance access model and privacy posture.

### Preserve legacy `/staff/login` compatibility

The legacy address will redirect to, or render, the new staff entry experience. Existing protected-route redirects may continue using this stable address until a later cleanup, avoiding a broad protected-route migration in the same change.

## Risks / Trade-offs

- [Purpose-specific login pages can imply role authorization] → State the workflow purpose in page copy, but always route authenticated users through `/staff` and retain server-side authorization.
- [The student guidance could be mistaken for a direct login link] → Explicitly say that attendance begins from the instructor-provided class QR code and omit a contextless sign-in control.
- [Existing bookmarks may expect the generic login form] → Preserve `/staff/login` as a compatibility route.
- [More visual differentiation can reduce small-screen usability] → Define mobile-first layout constraints and verify keyboard, screen-reader, and narrow viewport behavior.

## Migration Plan

1. Deploy the new public and staff-login routes with the shared credentials flow.
2. Retain `/staff/login` as the compatibility address and leave protected-route redirects unchanged.
3. Verify successful sign-in for each role, invalid credentials, disabled accounts, keyboard navigation, and mobile viewport behavior.
4. Roll back by restoring the legacy generic page while leaving authentication and workspace routing unchanged.

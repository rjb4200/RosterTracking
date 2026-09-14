## Why

The public landing page sends every staff member through one generic "Staff login" surface, which does not reflect the distinct class-operations and training-administration workflows. Separate entry points can make each path immediately understandable without changing the shared, secure authentication backend.

## What Changes

- Replace the single public staff-login call to action with distinct Instructor and Training Administration entry points, while explaining that student attendance begins from a class QR code.
- Add visually and semantically distinct Instructor and administrative login pages that share the existing credentials authentication action.
- Route every successful staff login through the existing role-aware `/staff` destination, regardless of the entry point used.
- Preserve `/staff/login` as a compatibility route that guides or redirects existing links to the new staff entry experience.
- Retain the current invalid-credential and disabled-account behavior without exposing roles before authentication.

## Capabilities

### New Capabilities
- `staff-entry-experience`: Public path selection and purpose-specific presentation for Instructor, training-administration, and class-attendance entry.

### Modified Capabilities
- `staff-authentication`: Successful credentials authentication directs staff to their resolved role-aware workspace rather than a generic staff destination.

## Impact

- Affected routes: `/`, `/staff/login`, new Instructor and administrative login routes, and the existing post-login redirect.
- Affected UI: landing page, staff-login shells, shared login form, responsive entry-page styling, and page metadata.
- Authentication and authorization services, credentials validation, session handling, and student QR-token flow remain unchanged.

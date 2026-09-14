## Why

Students currently need an instructor-distributed, unrecoverable QR link to begin attendance, which prevents a public view of active classes and forces instructors to save access material at the moment it is generated. Training staff need a stable, readable class link that works from a QR scan, manual entry, or the public landing page for the full open lifetime of a class.

## What Changes

- Add a public directory of open classes to the landing page, showing only course, next session, delivery location, assigned instructors, student sign-in action, and optional QR display.
- Give every newly created class a stable, human-readable four-character public code and short URL that remains valid while the class is open.
- Use the short URL for QR codes, typed access, and public-directory sign-in actions.
- Add an optional, off-by-default class access PIN. When enabled, students must provide the system-generated four-digit PIN before beginning attendance from any public entry path.
- Show the current short URL, QR code, and enabled PIN to authorized instructors while the class remains open.
- Preserve existing raw-token QR links for already-open classes until those classes lock; staff can generate stable public access for them.

## Capabilities

### New Capabilities
- `public-class-directory`: A minimal public directory of classes open for attendance, with direct student access and optional QR display.

### Modified Capabilities
- `class-sign-in-access`: Replace one-time opaque-link behavior for new classes with stable public short-code access and optional PIN gating while retaining lifecycle invalidation and legacy-link compatibility.
- `class-management`: Allow staff to configure whether a class requires a student access PIN and surface current student-access material to authorized instructors.

## Impact

- Affected data: class public access code, optional PIN state and protected PIN value, indexes, and migrations.
- Affected routes: public landing page, a root-level short-code resolver, legacy token resolver, and the tokenless student sign-in workflow.
- Affected UI: class creation/setup, active class detail, public landing cards, and QR-code rendering.
- Public disclosure is deliberately limited to open-class schedule and instructor identity details; no roster, reporting, or protected staff data is exposed.

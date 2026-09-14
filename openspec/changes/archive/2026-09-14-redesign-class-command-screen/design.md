## Context

The current class detail page separates setup, schedule, assignments, lifecycle, finalization, and token display, while the roster and manual attendance forms live on a separate route. Existing services enforce access and lifecycle rules but roster service access currently requires an instructor assignment.

## Goals / Non-Goals

**Goals:**
- Compose existing class, roster, sign-in, and lifecycle capabilities into one responsive operational page.
- Extend roster access deliberately so elevated staff can operate department classes.
- Keep server-side authorization and completion validation authoritative.

**Non-Goals:**
- Add a new class lifecycle state or a separate close-sign-in transition.
- Remove the dedicated roster route or redesign reporting/finalization rules.

## Decisions

### Status-aware command screen

Use one class-detail route with a compact live layout for open classes and focused setup, review, or finalized views for other statuses. The primary action maps to the existing transition rather than adding new mutations.

### Reuse roster capabilities with elevated access

Extract or extend roster authorization so assigned instructors and elevated staff can read and mutate the roster for classes they can manage. Existing attendance validation remains unchanged.

### Client-only presentation enhancements

Keep QR data server-generated and add a small client component for clipboard and browser fullscreen APIs. These controls do not create public data or bypass server checks.

## Risks / Trade-offs

- [A dense command screen becomes difficult on tablets] -> Prioritize QR, count, roster, and one primary action; place lower-frequency controls in secondary sections.
- ["Close sign-in" implies a new lifecycle] -> Label the existing completion transition as finishing attendance and review.
- [Elevated roster access broadens operator scope] -> Reuse the existing elevated-role determination used by class access.

## Migration Plan

1. Deploy the command screen and extended authorized roster access together.
2. Verify instructor and elevated-staff paths with E2E tests.
3. Roll back application changes without database migration.

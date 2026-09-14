## Why

Instructors and elevated staff must navigate away from their workspace to discover operational work. The existing workspace does not prioritize today's classes, overdue rosters, or the actions needed to keep attendance records finalized.

## What Changes

- Replace the instructor workspace landing page with a server-rendered operational class dashboard.
- Expand the administrator workspace with both personal teaching operations and department oversight.
- Surface role-scoped reminders for open or completed rosters more than 24 hours past their final scheduled session end.
- Enforce that all sessions in a class occur on one department-calendar day, preserving one roster per class day.

## Capabilities

### New Capabilities

- `operational-class-dashboards`: Role-aware teaching and oversight dashboards for classes and overdue rosters.

### Modified Capabilities

- `class-management`: Constrain class sessions to one department-calendar day.

## Impact

- Affects instructor and administrator workspace routes, class query services, class-session validation, styles, and E2E coverage.
- No schema migration is expected; dashboard data is derived from existing classes, sessions, attendance, assignments, and finalization records.

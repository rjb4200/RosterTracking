## Context

Instructor and administrator workspace routes are server-rendered, but their existing landing pages are static links. Classes, assignments, session schedules, attendance, and finalization records already exist, while the current class list lacks the schedule and roster summary needed for operational cards.

## Goals / Non-Goals

**Goals:**
- Present immediately actionable teaching work without exposing unrelated instructor classes.
- Give elevated staff personal teaching tools and department oversight in one administrator workspace.
- Keep one roster tied to one department day.

**Non-Goals:**
- Automatically complete or finalize classes.
- Change attendance, finalization, or reporting workflows.
- Add a new database table.

## Decisions

### Dashboard-specific read model

Create a server-side dashboard query that returns class summary cards with schedule day, final session end, assignment visibility, attendance count, reporting destinations, and finalization status. Instructor results are restricted to class assignments; elevated results include both assigned and department scopes.

### Lifecycle actions link to existing workflows

Cards link to existing class detail and roster routes rather than duplicating mutation controls. The QR control is an icon-only link/button with an accessible text label.

### Overdue is a reminder, not automation

Compute overdue status as final scheduled end plus 24 hours. Open cards direct users to complete the roster; completed cards direct them to review and finalize. Finalized and cancelled classes are excluded.

### Single-day session enforcement

Validate a component's department-calendar date against existing components for the class during saves. Existing historical data remains unchanged unless edited.

## Risks / Trade-offs

- [Classes without sessions cannot have an overdue time] -> Exclude drafts without scheduled sessions from overdue calculations.
- [Elevated staff dashboard is dense] -> Separate My Teaching and Department Oversight sections, prioritizing overdue cards.
- [Department time-zone boundaries] -> Use existing department time utilities for both day comparison and overdue calculations.

## Migration Plan

1. Deploy application changes without a schema migration.
2. Verify instructor visibility, elevated oversight, and overdue boundaries with E2E and service tests.
3. Roll back application changes if needed; underlying class records are unchanged.

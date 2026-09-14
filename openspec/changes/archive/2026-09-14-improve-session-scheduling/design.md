## Context

See proposal.md for motivation. Class components persist independently supplied `startsAt`, `endsAt`, and `creditedHours` values. The staff form exposes all three as editable inputs, while server validation only requires a positive duration and an end after start. Finalization snapshots preserve components, and official roster PDFs use the first component's title with the course name as a fallback.

## Goals / Non-Goals

**Goals:**
- Establish a single source of truth for a session's duration: credited hours.
- Keep staff-selected session start times on quarter-hour boundaries.
- Make the calculated schedule consistent in storage, class detail views, finalization snapshots, and official rosters.
- Retain the existing optional session-title and course-name fallback behavior.

**Non-Goals:**
- Change course duration defaults or automatically create sessions when a class is created.
- Change the stored component schema or migrate historical component values.
- Expand official roster support beyond its existing first-component usage.

## Decisions

### Derive the end timestamp from start and credit hours

The component form will collect start time and credited hours, calculate a display-only end time, and submit the calculated value. The server will independently derive the end timestamp from the submitted start and credited hours instead of trusting a client-provided end timestamp.

This prevents stale browser state and crafted requests from producing mismatched stored values. It also keeps the existing persisted `endsAt` field available to downstream queries and PDFs without a schema migration.

Alternative considered: allow manual end-time edits and recalculate credited hours. Rejected because it makes the reported instructional credit mutable indirectly and reintroduces two competing inputs.

### Use quarter-hour boundaries for starts

The new-session start value will default to the current local department time rounded to a 15-minute boundary. The form will use a 15-minute picker increment, and server validation will reject an off-boundary start supplied outside the UI.

Rounding to the nearest quarter hour follows the agreed behavior. The derived end time can include the quarter-hour precision represented by credited hours, which are accepted in quarter-hour increments by the staff form.

### Default new components to two hours

Only an unsaved component receives the `2.00` credit-hour default. Existing components retain their stored credit hours until a staff member changes them.

### Keep session-title behavior unchanged

The title remains optional. Its visible label fallback remains `Training session` in staff scheduling, while the finalization and roster fallback remains the course name. This change documents rather than expands the title's reporting role.

## Risks / Trade-offs

- [Legacy draft component has an end time inconsistent with credited hours] -> Preserve it until edited; derive a consistent end only when staff save an edit.
- [Client calculation differs from server timezone handling] -> Use the same department datetime parsing and calculation semantics on the server as the authoritative persisted result.
- [A credit-hour value is not divisible into a quarter hour] -> Constrain staff entry to quarter-hour increments and validate it server-side so derived ends stay aligned.

## Migration Plan

1. Deploy the form and server validation together; no database migration is required.
2. Verify new and edited draft sessions persist a calculated end time and official roster output remains unchanged except for the documented title fallback.
3. Roll back application code if needed; existing component records are unchanged and remain compatible.

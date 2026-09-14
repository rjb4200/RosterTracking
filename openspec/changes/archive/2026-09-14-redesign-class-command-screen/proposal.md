## Why

Instructors must move between a class detail page, roster page, lifecycle controls, and QR panel to run one class. This exposes internal workflow structure instead of presenting the immediate actions needed during instruction.

## What Changes

- Redesign the class detail route as a status-aware instructor command screen.
- Put live class facts, sign-in access, QR projection, attendance, manual entry, and the primary lifecycle action in one operational view.
- Let elevated staff operate any department class through the same screen; assigned instructors retain access to their own classes.
- Replace technical lifecycle labels with plain operational actions while retaining current validation and authorization rules.

## Capabilities

### New Capabilities

- `live-class-command-screen`: A unified operational interface for managing an individual class while it is being taught.

### Modified Capabilities

- `class-management`: Present class lifecycle actions in operational language on the class command screen.
- `instructor-roster`: Surface live roster data and manual attendance entry in the class command screen.
- `class-sign-in-access`: Make active-class sign-in access easy to copy and display in full-screen QR mode.

## Impact

- Affects the protected class-detail route, class and roster read models, client action controls, responsive styles, and E2E coverage.
- Reuses existing lifecycle, attendance, reporting, finalization, and permission services; no schema migration is expected.

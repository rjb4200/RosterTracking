# Improve Empty States with Guidance and Next Actions

## Why

Empty states across the staff experience confirm that a list or section is empty without telling an operator what the absence means or what to do next (for example "No assigned teaching work." or "No students found."). Inexperienced staff are left to guess. The copy is also implemented three different ways, so it drifts and cannot be improved consistently.

## What Changes

- Introduce one shared `EmptyState` presentation primitive (`src/components/ui/empty-state.tsx`) with an optional icon, a required title, an optional description, and an optional next action.
- Classify each major empty state by intent — reassurance ("nothing needs attention"), orientation ("empty now, here is what is next"), or action ("nothing exists yet, create one") — and word it accordingly.
- Operational dashboards: explain the empty section and, where useful, surface the next upcoming class in the "today" section.
- Staff list screens (reference catalogs, students, staff accounts, MTU catalog, class list): distinguish "no records yet" (offer the create action) from "no search matches" (offer to clear the search).
- Public directory: orient visitors when no class is open for sign-in.
- Replace the ad-hoc empty-state markup and the legacy `.operational-empty` and `.public-class-empty` styles with the primitive.

## Capabilities

### New Capabilities

- `empty-state-guidance`: the shared empty-state primitive and the cross-cutting presentation standard — an empty state explains the absence, offers a next action when one exists, stays concise, and stays consistent across sections.

### Modified Capabilities

- `operational-class-dashboards`: dashboard sections explain their empty state and may surface the next upcoming class.
- `public-class-directory`: the empty directory orients a visitor.
- `reference-catalog-management`: catalog lists separate "no records yet" from "no search matches" with the relevant action.
- `class-management`: the class list empty states guide toward creating work or confirm that nothing is pending.
- `students`: the student list separates "no students yet" from "no search matches".
- `staff-account-management`: the account list separates "no accounts yet" from "no search matches".
- `mtu-catalog`: the MTU catalog list empty states guide toward creating entries.

## Impact

- New: `src/components/ui/empty-state.tsx`.
- Changed pages: `src/app/staff/(protected)/admin/page.tsx`, `src/app/staff/(protected)/instructor/page.tsx`, `src/app/staff/(protected)/operational-class-dashboard.tsx`, the reference list pages (`agencies`, `sites`, `training-codes`, `curricula`), `students`, `accounts`, `mtu-catalog`, `classes`, and the public `src/app/page.tsx`.
- CSS: retire `.operational-empty` and `.public-class-empty` in favor of token-based styles.
- No data-model, API, permission, or migration changes.

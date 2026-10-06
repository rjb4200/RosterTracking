## Why

The Training site control offers a "Recently used" group so staff reach their common sites quickly, but the Curriculum control does not, even though the same usage data exists. Staff who teach from the same few books must scroll the full approved list every time.

## What Changes

- Add a per-staff "Recently used" group to the wizard's Fire subject Curriculum control, built from the curricula used in the staff member's last 10 created or instructed classes, mirroring the Training site control (including listing a recent curriculum in the full-catalog group as well).
- Document recently-used-first ordering for the wizard's searchable catalog controls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-creation-wizard`: searchable catalog controls offer a recently used group first.

## Impact

- **Services**: `listClassFormOptions` returns `recentCurriculumIds` alongside `recentSiteIds`.
- **UI**: the wizard passes `recentCurriculumIds` to `fire-subject-fields.tsx`, which groups the curriculum options.
- **Scope**: the wizard's Fire subject Curriculum only; the edit/review session form is unchanged.
- **No schema, API, or data changes; no breaking changes.**

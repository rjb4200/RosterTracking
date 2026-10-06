## Context

See `proposal.md -- Why`. Current state that shapes the approach:

- `listClassFormOptions` (`classes/services.ts`) computes `recentSiteIds` from the actor's last 10 created or instructed classes and returns it with the other options.
- The wizard builds `siteSearchOptions` with a `Recently used` group then `All sites`, and passes them to `SearchSelect`.
- The Fire subject row (`fire-subject-fields.tsx`) builds the curriculum options from the `curricula` prop and renders them through `SearchSelect`; it also owns `curriculumLabel`.
- `class_components.curriculumId` stores the catalog reference (nullable); a typed curriculum lives in `curriculumName` and has no catalog id.

## Goals / Non-Goals

**Goals:**
- Offer a per-staff `Recently used` group in the wizard's Fire subject Curriculum control, mirroring Training site.

**Non-Goals:**
- The edit/review session form's Curriculum select.
- Grouping the Category (training code) control.
- Any global (non-per-staff) recency.

## Decisions

### Decision: Compute `recentCurriculumIds` in `listClassFormOptions`

Mirror the site query: join `class_components` to `training_classes`, keep rows where the actor created the class or is an instructor and `curriculum_id` is not null, order by the class's `updated_at` descending, take 20, and de-duplicate. A class can hold up to two subjects, so the window is doubled relative to sites before de-duplication. Return it alongside `recentSiteIds`.

### Decision: Group the curriculum options, mirroring sites

Add a pure helper `curriculumSearchOptions(curricula, recentCurriculumIds)` that returns a `Recently used` group followed by an `All curricula` group that includes every active curriculum (recent entries appear in both, matching sites). Move `curriculumLabel` into `fire-subjects.ts` so the helper and the row share one label format. The wizard passes `recentCurriculumIds` down to `FireSubjectRow`.

### Decision: Scope to the wizard's Fire subject

Only the Fire subject Curriculum control changes. The edit/review session form keeps its plain select.

### Decision: Accept the auto-select interaction

With the first-match auto-select, typing picks the first rendered match, so a recently used curriculum wins over an alphabetical one. This is consistent with Training site and is accepted.

## Risks / Trade-offs

- One more query on wizard load → the same shape as the existing site query, with an added join; acceptable.
- Recent curricula appear in both groups → composite option keys already handle the duplication, matching sites.
- The `Recently used` group can hold up to ~20 entries → de-duplicated and bounded by the class window.

## Migration Plan

None. Pure UI and query changes; rollback by revert. No schema or data changes.

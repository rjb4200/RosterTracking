## Why

The chapter field relies on a native `<datalist>`. Mobile browsers render those suggestions as a small list attached to the keyboard, often showing only a few rows with no reliable scrolling. The chapter catalog is small but uneven — the largest dev curriculum has 23 chapters across two sections — so staff on a phone cannot reach most of the list.

## What Changes

- Replace the chapter datalist in class creation and session editing with the app's existing searchable select pattern: a filter box over a native select.
- Group chapter options by their curriculum section, such as Firefighter I and Firefighter II.
- Add a `Not listed (type one)` choice that reveals a free-text chapter input, preserving the existing typed-chapter requirement.
- Clear the chapter whenever the selected curriculum changes, in both class creation and session editing.
- Mark the chapter required in the session editor when the chosen curriculum has catalog chapters, matching the wizard and server behavior.
- Use one shared chapter control in both forms instead of duplicating the datalist markup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `curriculum-chapters`: the Fire subject chapter is chosen from a filterable, section-grouped selection that scrolls on small screens, still accepts a typed chapter through `Not listed`, and is cleared when the curriculum changes.
- `class-management`: a session's chapter uses the same shared selection, is required when the curriculum has catalog chapters, and is cleared when the session's curriculum changes.

## Impact

- `src/app/staff/(protected)/classes/fire-subject-fields.tsx`
- `src/app/staff/(protected)/classes/component-form.tsx`
- A new shared chapter selector beside `search-select.tsx` and `curriculum-select.tsx`
- `src/modules/classes/fire-subjects.ts` for chapter option grouping and catalog matching
- Browser coverage for class creation, session editing, and the post-class workspace
- No database, migration, API, or server-validation changes

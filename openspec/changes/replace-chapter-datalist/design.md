## Context

Two forms attach a curriculum chapter: the Fire subject rows in class creation and the session editor used by the class edit page and the post-class workspace. Both use a text input with a native `<datalist>`.

Mobile browsers render datalist suggestions themselves. The list is anchored near the keyboard, shows only a few rows, and does not reliably scroll. The largest dev curriculum has 23 chapters across two sections, so most chapters are unreachable on a phone.

The app already has a catalog-or-typed pattern in `CurriculumSelect`: a `SearchSelect` (filter input plus native select), a pinned `Not listed (type one)` option, and a footer input for the typed value. `SearchSelect` also supports option groups.

## Goals / Non-Goals

**Goals:**

- Make every catalog chapter reachable on a phone through a real scrolling picker.
- Keep the ability to type a chapter that is not in the catalog.
- Group chapters by section so long labels are easier to scan.
- Clear the chapter when the curriculum changes.
- Use one shared control in class creation and session editing.
- Make the session editor’s chapter requirement match the wizard and server.

**Non-Goals:**

- Changing the chapter catalog, its labels, or its storage.
- Changing official roster output or finalization snapshots.
- Adding a custom modal picker or a new dependency.
- Searching across other curricula’s chapters.

## Decisions

### Reuse `SearchSelect` with a `Not listed` footer

Render the chapter control like `CurriculumSelect`:

```
CHAPTER *
┌──────────────────────────────────────┐
│ Search chapters…                     │
│ [ Chapter 3. Communications      ▾ ] │  ← native select
└──────────────────────────────────────┘
      Firefighter I
        Chapter 1. ...
        ...
      Firefighter II
        ...
      Not listed (type one)
```

Choosing a catalog option stores its `chapterLabel`. Choosing `Not listed` reveals a footer input for the typed chapter. The native select opens the platform picker, which scrolls and does not depend on datalist behavior.

Alternatives considered:

- **Plain native select plus an “Other” option**: simpler, but loses filtering, and long labels make native typeahead weak.
- **Input plus a Browse dialog**: good search and mobile behavior, but more focus management and a new modal pattern.
- **Custom combobox**: recreates the keyboard-overlap problem and needs more accessibility work.

### Group options by section

Use `SearchSelectOption.group` with the chapter’s `part` as the group heading. Unsectioned chapters use no group. The option value and label remain `chapterLabel(chapter)` so stored and printed labels do not change.

### A sentinel distinguishes catalog from typed

Use a sentinel such as `__not_listed__` for the pinned option; real chapter labels can never equal it. When the current value matches a catalog label, the select shows that label. When the value is non-empty but not in the catalog, the control opens in `Not listed` with the footer input populated, preserving existing data.

The footer input is required only when `Not listed` is active. When a catalog option is chosen, the footer input is hidden and the typed value is discarded.

### Clear the chapter when the curriculum changes

In both parents, changing the curriculum clears the chapter value and remounts the chapter control so its local `Not listed` state resets. This prevents a stale chapter from the previous curriculum, including a stale typed value.

### One shared control

Add a `ChapterSelect` used by `FireSubjectRow` and `ComponentForm`. It accepts the filtered chapter list, the current value, an optional form field name, and required/invalid state.

- With catalog chapters: render `SearchSelect` plus the conditional footer input.
- Without catalog chapters: render the existing free-text input, optional.
- Keep a hidden `curriculumChapter` input where the form submits by field name, so the server contract is unchanged.

### Require the chapter consistently

When the selected curriculum has catalog chapters, mark the chapter required in both forms. The session editor currently omits the mark even though the server rejects an empty chapter; the shared control fixes that inconsistency. The server remains the authority.

## Risks / Trade-offs

- **`SearchSelect` auto-selects the first filter match as staff type** → This is the established behavior for curricula and categories; choosing a catalog chapter is the common path. If it proves noisy, add an opt-out prop later.
- **Clearing the chapter on a curriculum change is a behavior change** → Intended, and it prevents a wrong chapter from being saved. Existing records are untouched until edited.
- **Native pickers are platform UI** → Playwright cannot assert the OS scrolling itself. Tests should assert that every catalog option exists, that filtering narrows the list, and that the typed fallback appears; the mobile scroll follows from using a native select instead of datalist.
- **Long chapter labels** → Grouping and filtering reduce scanning. Native pickers wrap or scroll long labels.
- **A stored chapter not in the selected curriculum** → The control opens in `Not listed` with the value intact, so a legacy value is not silently lost; changing the curriculum then clears it.
- **Required chapter in the session editor may block a save that previously reached the server** → It matches the server’s existing rule, so the blocking moves earlier and becomes clearer.

## Migration Plan

No database migration. Existing chapter strings remain stored as-is. On first edit, a value that matches a catalog label is shown in the select; a non-matching value is shown in the `Not listed` input. Changing the curriculum clears the chapter. Rollback is a UI-only revert.

## Open Questions

None.

## Context

`WorkspaceArea` (`workspace-areas.tsx`) is a client component that owns one `openId` for the page and renders a header (`h3`, optional summary) plus an "Edit"/"Close" toggle. The editors themselves are separate client forms passed as server-rendered children, and each one submits through its own `useActionState` action with a button in the body. The schedule area does not use a single editor at all: the page maps every component to a `ComponentForm`, so each session carries its own submit button.

That splits the action from the control: the toggle lives in the header, the submit lives in the body, and they cannot see each other.

## Goals / Non-Goals

**Goals**

- One place to save and close any draft editor: `[Close] [Save and close]` in the area header.
- Remove in-body submit buttons from the class, MTU, and session editors.
- Never lose unsaved edits silently.
- Keep the instructor area honest: immediate actions, close only.

**Non-Goals**

- Changing finalization, readiness, or authorization.
- Adding a "Save" that keeps the editor open.
- Restyling the editors or their fields.
- Reworking the class-edit screen (it keeps its own forms and its MTU block).

## Decisions

### 1. Actions live in the area header; the submit targets the form by id

Each draft form renders with a stable id (`class-details-form`, `mtu-usage-form`, `session-form`). The header renders `<Button type="submit" form={id}>Save and close</Button>`. The `form` attribute submits and validates the form even though the button sits outside it, so native required-field validation and the existing action wiring are preserved. The form body contains no submit control.

### 2. The workspace context tracks the open form and its dirty state

`WorkspaceProvider` gains a small registry: the open area's form id and a `dirty` boolean. Draft forms register on mount (`useEffect`) and report the first user change. The header shows `[Close] [Save and close]` only when a registered form exists for the open area; otherwise it shows `[Close]`. Instructors registers no form, so it never shows a save.

Dirty detection is a single `onChange` on the `<form>` element: React events bubble, so it covers controlled and uncontrolled fields alike without diffing. The flag resets when the action reports success, which also unmounts the editor.

### 3. Saving closes on success, and only on success

The form already receives its action result from `useActionState`. A shared hook closes the area when `state.success` becomes true. On failure the area stays open, values are retained, and the existing error output renders in the body. The header label stays static; the body shows a pending note while the action runs. Sharing pending state with the header would require lifting each form's action state into the provider, which is more coupling than the benefit.

### 4. Discard confirmation uses the existing dialog primitive

The provider holds a pending navigation target (`close` or another area id). When the current editor is dirty, choosing Close or another area sets that target and opens a confirmation built on `src/components/ui/dialog.tsx` ("Discard unsaved changes?"). Discard applies the target; Cancel clears it and leaves the editor and its values in place. Clean editors close immediately. Using the existing dialog keeps the behaviour accessible and visually consistent; `window.confirm` would block and look foreign.

### 5. The schedule edits one session at a time

A client component (`ScheduleSessions`) receives the serializable session rows, the form options, and the actions. It renders read-only rows with `Edit` and an `Add session` control, holds the selected session id (`string | "new" | null`), and renders exactly one `ComponentForm` with `id="session-form"`. Selecting a different session while dirty goes through the same discard confirmation. Rows show title, time range, and hours; they no longer expand into fields.

This is what makes the header action bar possible for the schedule: one open form means one thing to save.

## Risks / Trade-offs

- **Dirty detection can miss programmatic changes.** Fields set by an action or a script rather than a user event will not mark the form dirty. Acceptable: those paths save immediately.
- **The discard prompt can interrupt flow.** It only appears when the operator has actually changed something, and cancelling is non-destructive.
- **The schedule restructure touches more than a button.** It moves session editing into a client component and requires serializing session data to it; the row markup and the "Add session" placement change. This is the one area with real regression surface.
- **External submit depends on the `form` attribute.** Supported in all targeted browsers; a missing id would produce an inert button, so ids are constants shared by the form and the header rather than strings typed twice.

## Migration Plan

None. No schema, migration, seed, or data change; the workspace is presentation and client state only.

## Open Questions

None.

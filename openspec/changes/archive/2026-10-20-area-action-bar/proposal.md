## Why

The post-class workspace has three different save models on one screen. Class details and MTU usage render their own submit buttons inside the form body, with different labels and button variants ("Save class details" as a primary button, "Save supplies and equipment" as a secondary one). The schedule renders one always-open form per session, so the area can show a whole stack of "Update session" buttons. The instructor area has no save control at all, because its controls act immediately. The result is that an operator cannot learn one habit: the same screen offers different button positions, labels, and styles, and nothing prevents closing an editor and losing changes.

## What Changes

- **One action bar, at the top.** When a draft editor is open, its area header replaces the lone "Close" control with **Close** and **Save and close** side by side. Closed areas keep their existing "Edit" control. No submit control is rendered inside the editor body.
- **The header saves the open form.** Each draft editor exposes a stable form id, and the header's "Save and close" submits that form. Saving closes the area on success; a rejected save keeps the editor open with its values and shows the error.
- **Instructors stops pretending.** Its controls act immediately (Make lead, Remove, Add instructor), so the area shows only "Close" in its header and keeps its inline actions. No save control is added where nothing is drafted.
- **Unsaved edits are protected.** Closing an editor, or switching to another area, while it holds unsaved changes asks the operator to confirm discarding them. Cancelling keeps the editor and its values.
- **The schedule becomes one editor.** Sessions render as read-only rows with a per-row edit affordance and an "Add session" control. One session editor is open at a time and uses the same action bar, so the header always has exactly one form to save.

Unchanged: authorization, readiness checks, finalization and reopening, the MTU review list and estimate advisory, hours formatting, and the documents and delivery flow.

## Impact

Affected code: `workspace-areas.tsx` (workspace context and area header), `class-form.tsx`, `component-form.tsx`, `mtu-usage-form.tsx` (register form id and dirty state, drop the in-form submit), `instructor-*` (no save), the review page's schedule area (new client component), and the workspace styles.

Risk: the schedule restructure touches the session editor and the page that supplies session data; the other areas only lose a button. No schema, migration, or data change.

## Capabilities

### Modified Capabilities

- `guided-roster-finalization`: the workspace gains one action bar for draft editors, a discard confirmation, and a single-session schedule editor; instructors keeps immediate actions with close only.

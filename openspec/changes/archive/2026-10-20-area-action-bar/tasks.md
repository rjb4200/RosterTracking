## 1. Action bar in the area header

- [x] 1.1 Extend the workspace context to register the open area's form id and dirty state, and reveal `Close` and `Save and close` in the area header only when a form is registered.
- [x] 1.2 Give each draft form a stable id and submit it from the header with the `form` attribute; remove the in-body submit buttons from `class-form.tsx`, `mtu-usage-form.tsx`, and `component-form.tsx`.
- [x] 1.3 Close the area when the action reports success, keep it open with values and the error when it fails, and show a pending note in the body.
- [x] 1.4 Confirm the instructor area registers no form, so its header shows `Close` only and its inline actions are unchanged.

## 2. Discard confirmation

- [x] 2.1 Hold a pending close/switch target in the workspace context and confirm it with the existing dialog primitive when the open editor is dirty; discard applies the target, cancel keeps the editor.
- [x] 2.2 Mark the editor dirty from a form-level change handler and clear it when the action succeeds.

## 3. Schedule edits one session

- [x] 3.1 Render sessions as read-only rows showing title, time range, and hours, with a per-row edit affordance and an `Add session` control.
- [x] 3.2 Add a client schedule component that holds the selected session (`new` or an id) and renders one `ComponentForm` with a constant form id; route session switches through the discard guard.

## 4. Tests

- [x] 4.1 Cover saving from the header: the area closes and its summary updates.
- [x] 4.2 Cover a rejected save: the editor stays open with its values and the error.
- [x] 4.3 Cover the discard prompt on close and on switching areas, including cancel keeping the values.
- [x] 4.4 Cover the instructor area showing no save while its actions still take effect.
- [x] 4.5 Cover editing one session at a time and adding a session through the same editor.

## 5. Verification

- [x] 5.1 Run `npm run check`, the unit suite, and `npm run build`.
- [x] 5.2 Run the review e2e spec and `openspec validate area-action-bar --strict`.

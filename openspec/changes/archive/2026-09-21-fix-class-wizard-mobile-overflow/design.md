## Context

See `proposal.md` — Why. The relevant current state:

- `src/app/globals.css` gives `.search-input { width: 100% }` but `.select-input` only a shared border/padding block with no width. Native `<select>` elements size to their longest option, so a long course, site, or instructor name sets an intrinsic min-content width for the control.
- `.field` is `display: grid`, `.stack-form` is `display: grid`, and each is a grid item of its parent. Because grid items default to `min-width: auto`, that intrinsic width propagates outward: control → `.field` → `section.stack-form` → `form.class-wizard` → `main.admin-content` → document. Measured effect at a 412px device width: the form renders 392px inside a content box of ~371px, and the document width becomes 413px.
- On mobile emulation the resulting layout viewport is wider than the visual viewport. Playwright's pointer hit-test at the intended control centre then resolves to the step `<section class="stack-form">` or the `.class-wizard-actions` row, so the click is reported as intercepted and never delivered. On desktop widths the same page has no overflow and the control is reachable.
- Reproduction is width- and data-dependent: deterministic at 320–375px, and at 412px it is tipped over only by long option labels such as the end-to-end fixtures' `crypto.randomUUID()` course and site names.

## Goals / Non-Goals

**Goals:**

- Remove the horizontal overflow at its source so the wizard fits its container at every supported narrow width, independent of the length of catalog names.
- Guarantee the wizard's step-advance and submit controls are pointer-operable on narrow mobile viewports.
- Restore narrow-viewport browser coverage for the wizard and remove the known-issue carve-out.

**Non-Goals:**

- Redesigning the wizard's steps, validation, or navigation behavior.
- Changing the wizard's markup or React logic unless the CSS guardrail proves insufficient.
- Restyling unrelated staff screens, beyond a shared control rule whose reach is intentional.

## Decisions

**Decision: make the control fluid rather than hiding the overflow.**
Set `.select-input { width: 100% }`, matching the existing `.search-input` rule. This is the same pattern already used for text inputs and confirmed in a standalone reproduction to eliminate the overflow and restore clickability at 320–540px.
Alternatives considered:
- `overflow-x: hidden` on the form or page — rejected: it masks the defect, keeps the control off the visible layout, and can clip focus rings and native select popups.
- Replacing `<select>` with a custom listbox — rejected: disproportionate to a layout defect and changes established form behavior.

**Decision: add a structural guardrail so the defect cannot silently return.**
Allow form grid children to shrink below their content's intrinsic width, e.g. `min-width: 0` on the direct children of the wizard's `.stack-form` and `.field` grids. The control rule fixes today's offender; the guardrail contains a future over-wide control instead of letting it widen the page again. The guardrail is scoped to the wizard/form layout, not applied globally, so unrelated layouts keep default grid sizing.

**Decision: verify with a narrow-viewport browser regression on `mobile-chrome`.**
The defect is only observable through real layout and hit-testing, so the regression must run in a browser at a narrow mobile viewport and assert both that the page has no horizontal overflow and that the step-advance control is pointer-operable. Prefer a read-only journey (select existing catalog entries; do not create a class or site) so it can run on both `chromium` and `mobile-chrome` without duplicating mutations; keep the existing mutate-once creation journey on `chromium`.

## Risks / Trade-offs

- [`.select-input { width: 100% }` changes select appearance on desktop staff screens] → The wizard and other staff forms already render text inputs full width; matching that treatment is consistent and was visually validated at narrow and wide widths. Confirm the admin screens that use `.select-input` at review time.
- [`min-width: 0` lets long option text be visually truncated by the control] → Native selects already clip long option text at their own width; this is the intended behavior and preferable to widening the page.
- [A future control type regresses the same way] → The guardrail plus the mobile regression test detect it; the spec requires the behavior rather than the specific CSS.

## Migration Plan

Pure CSS (and, only if needed, markup) change; no data or schema migration. Deploy with the normal release. Rollback restores the previous `globals.css` rules and has no data implications.

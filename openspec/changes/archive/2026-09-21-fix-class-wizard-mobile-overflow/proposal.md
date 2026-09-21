## Why

The class creation wizard overflows horizontally on narrow mobile viewports: its native `<select>` controls size to their longest option labels instead of the form width, widening the whole page. The resulting layout makes the wizard's step-advance control unreachable by pointer on phone-sized screens, so class creation cannot be completed on a phone, and the browser suite must exclude mobile coverage for class creation and roster finalization.

## What Changes

- Constrain the wizard's form controls so long option labels can no longer widen the form beyond its container.
- Add a structural guardrail so a future over-wide control is contained by the form layout rather than expanding the page.
- Add a specification requirement that the wizard must not overflow horizontally and must keep its step-advance controls pointer-reachable at narrow widths.
- Add a browser regression test that exercises the wizard at a narrow mobile viewport.
- Re-enable mobile coverage for the class creation and roster finalization browser specs and remove the known-issue entry.

## Capabilities

### New Capabilities

<!-- none: this change corrects existing wizard layout behavior, it introduces no new capability -->

### Modified Capabilities

- `class-creation-wizard`: adds a responsive-layout requirement that the wizard never causes horizontal overflow and that its step-advance and submit controls remain pointer-reachable on narrow mobile viewports.

## Impact

- Affected code: `src/app/globals.css` (shared input/select and wizard layout rules); `src/app/staff/(protected)/classes/class-creation-wizard.tsx` only if markup adjustment proves necessary.
- Affected tests: `tests/e2e/class-creation.spec.ts` and the finalization browser spec gain narrow-viewport coverage; `docs/verification.md` loses its known-issue carve-out.
- No authorization, permission, or workflow behavior changes; existing `/staff/classes/new` URLs and step semantics are unchanged.

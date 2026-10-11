## Context

The class-creation wizard (`class-creation-wizard.tsx`) gates each step through `wizardStepErrors(key, input)` in `src/modules/classes/wizard-validation.ts`, which returns the stable keys of missing controls. `next()` advances only when that list is empty and otherwise sets `attempted`, which highlights controls via `errors.includes(key)` and shows "Complete the highlighted fields."

Today `wizardStepErrors` has branches for `destinations`, `fire`, `kbems`, and `class` — but not `mtu`, so the MTU step always reports ready. The only enforcement of the mileage rule is the server-side `assertCreationMileage` (`services.ts`), reached at final submission, whose error surfaces as `state.error` at the bottom of the form. The rule itself is already specified in `mtu-usage-tracking`; see `proposal.md` for motivation.

Relevant existing shapes:
- `MtuUsageFields` receives `requireMileage` and computes `drivingSelected` from its `catalog` (which carries `requiresMileage`) and `value.transportIds`. It renders the mileage input inside a `<details>` that opens automatically when a driving transport is selected.
- `MtuUsageFields` has no way to render an invalid state today.

## Goals / Non-Goals

**Goals:**
- Make the MTU step block advancement under exactly the same condition the server enforces at creation: a selected transport entry with `requiresMileage` and an empty mileage estimate.
- Highlight the mileage field on a blocked attempt, consistent with every other wizard step.
- Keep a single, testable client rule that stays in lockstep with the existing server rule.

**Non-Goals:**
- Changing the server rule or the create-only semantics (edits, finalization, and post-finalization usage changes stay unenforced).
- Making mileage unconditionally required, or requiring it on the review/finalization usage form.
- Any database, API, or catalog-admin change.

## Decisions

**1. Put the rule in `wizardStepErrors` as an `mtu` branch.**
This is the wizard's single source of step gating and its highlight contract; a one-off check inside the component would duplicate that contract and miss the "attempted" highlight behavior.
- Alternative considered: validate inside `MtuUsageFields` and disable/guard the Next button. Rejected — Next lives in the wizard, and disabling it hides *why* the step is blocked.

**2. Precompute the condition in the wizard; pass primitives into the validator.**
Add `mtuMilestone...`-style primitive inputs to `WizardValidationInput`: the current `mileage` and a boolean `mtuMileageRequired`. The wizard computes `mtuMileageRequired` from the catalog and selected `transportIds` — the same inputs `MtuUsageFields` already uses to compute `drivingSelected` — and passes it down. The validator stays a pure function over primitives, matching its existing style.
- Alternative considered: pass raw `mtuUsage` and the full catalog into the validator and compute there. Rejected — it duplicates catalog-shape logic and enlarges the input surface for no benefit.

**3. Surface invalidity through an explicit prop on `MtuUsageFields`.**
Add an optional `mileageInvalid?: boolean` (or a more general `invalidKeys`) prop; when set, the mileage input renders `aria-invalid` like the other wizard fields. The wizard passes `errors.includes("mtuMileage")`.
- Alternative considered: leave the field unhighlighted and rely only on the banner text. Rejected — the issue asks to point the user at the field, and the other steps already highlight.

**4. Make the wizard validation authoritative; retire the inert `required` attribute.**
`required={drivingSelected}` on the mileage input never fires because Next is `type="button"`. Keep one source of truth: the wizard rule drives both gating and the invalid styling. The exact treatment of the now-redundant attribute is an implementation detail, but we should avoid implying native validation is doing work.
- Alternative considered: convert the MTU Next button to submit to trigger native validation. Rejected — the wizard is a single multi-step form; native submit semantics don't fit and would bypass the `wizardStepErrors` contract.

## Risks / Trade-offs

- [Client and server rule drift] → Keep the server check authoritative and unchanged; add a unit test for the `mtu` validator branch and extend the existing e2e wizard test so both layers are covered. Both derive from the same `requiresMileage` flag.
- [Catalog data missing `requiresMileage` at the step] → `MtuCatalogOption` already exposes `requiresMileage`; the wizard already passes the catalog that `MtuUsageFields` uses for `drivingSelected`, so the same values feed validation.
- [Mileage entered as `"0"`] → Treated as provided (non-empty), matching the server's `trim() === ""` check. No behavior divergence.
- [Hidden field not visible when highlighted] → A driving transport auto-opens the mileage `<details>` (existing behavior), so the highlighted field is on screen.

## Migration Plan

Frontend-only, no persisted data or API change. Deploy with the normal client build; roll back by reverting the change. No backfill or coordination step.

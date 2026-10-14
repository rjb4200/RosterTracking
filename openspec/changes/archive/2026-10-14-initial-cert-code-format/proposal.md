## Why

KBEMS initial-certification classes must carry a state-assigned course number in a fixed shape (TEI–year–Class ID–Type). Today the KBEMS step accepts any free text and, for dual Fire+EMS classes, seeds the field from the first Fire subject's training code — which is not a valid initial-certification number. Instructors also retype the same number class after class with no way to reuse it.

## What Changes

- Initial-certification course numbers are expected in `<TEI>-<YY>-<CC>-<T>`: a 3-digit TEI, a 2-digit year, a 2-digit Class ID, and a Type letter of `R`, `B`, `A`, or `P`. The value is matched case-insensitively and stored uppercase.
- The TEI prefix is one global value, administratively editable, defaulting to `126`. Its editing control is a subdued, admin-only field on the Reporting page.
- A non-empty initial-certification number whose shape does not match warns through a dialog the instructor explicitly acknowledges; the shape check never blocks. An empty number still blocks the KBEMS step, as today.
- The Fire training-code prefill is suppressed for initial-certification classes; it is unchanged for Continuing education and Refresher classes.
- The KBEMS step offers the five most recently used initial-certification numbers — a list shared across staff — for selection; a new number can still be typed.

## Capabilities

### New Capabilities
- `initial-certification-settings`: one global TEI number that prefixes initial-certification course numbers, editable only by administrators.

### Modified Capabilities
- `class-creation-wizard`: the KBEMS step's Initial-certification course number gains an expected format, a soft shape warning with instructor acknowledgement, suppression of the Fire prefill for initial certification, and selection from recently used numbers.

## Impact

- New settings store and module for the TEI value, read by the wizard and edited from Reporting.
- `src/app/staff/(protected)/reporting/page.tsx` and `actions.ts`: a subdued, admin-only TEI edit form.
- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`: the course-number control (select-or-type), suppression of the Fire prefill effect, and the malformed-shape dialog.
- `src/modules/classes/services.ts`: the class-creation options builder gains the TEI and the recent-number list; `assertKbemsDetails` keeps its empty-only block.
- `src/modules/classes/wizard-validation.ts`: the empty-only required rule is unchanged; the shape check is non-blocking.
- Tests: `wizard-validation.test.ts`, `class-wizard-course-number.spec.ts`, and new unit/e2e coverage.

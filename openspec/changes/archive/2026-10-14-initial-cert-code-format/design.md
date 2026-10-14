## Context

A KBEMS class stores an EMS course type and a free-text course number on `classes` (`course_type`, `course_number`; see `src/server/db/schema/classes.ts` and `services.ts:140`). The class-creation wizard's KBEMS step treats the course number as free text, required only for Initial certification, and — when Fire and KBEMS are both selected — seeds it once from the first Fire subject's training code (`class-creation-wizard.tsx:217-234`). That seed is a Fire training code, not a state initial-certification number.

The department's initial-certification numbers follow one shape: `<TEI>-<YY>-<CC>-<T>` (e.g. `126-26-02-R`), where TEI is a fixed program number, YY a two-digit year, CC a two-digit state-assigned Class ID, and T one of `R`, `B`, `A`, `P`. Instructors reuse the same number across many classes.

Existing patterns this design leans on:
- Per-actor "recently used" lists are derived in `services.ts:1911-1972` and rendered through a search control (`curriculum-select.tsx`, `SearchSelect`).
- The reporting page is gated by `reporting.manage`; administrator checks use `isAdministrator(actor.roleCodes)`.
- A `dialog.tsx` primitive exists for the acknowledgement popup.

## Goals / Non-Goals

**Goals:**
- Expect the initial-certification number shape, with a globally configurable TEI.
- Warn on a malformed number and require instructor acknowledgement, without blocking the step.
- Suppress the Fire prefill for Initial certification; keep it for Continuing education and Refresher.
- Offer the five most recently used initial-certification numbers for selection.

**Non-Goals:**
- Changing the schema or type of `classes.course_number`.
- Server-side shape blocking; the shape check is advisory only.
- A managed catalog of initial-certification numbers (the list is derived).
- Changing Continuing education or Refresher handling, or the completion-certificate output.
- Applying the soft shape check to the class edit form (`class-form.tsx`) in this change.

## Decisions

**D1 — Format and normalization.** Match with a single regular expression built from the configured TEI against the trimmed, uppercased value: `^<TEI>-\d{2}-\d{2}-[RBAP]$`, storing the uppercased value. Chosen over segmented inputs (TEI, year, ID, type) because the number is one state-assigned string that is stored and printed verbatim; splitting it would add controls and rejoining logic for no benefit.

**D2 — TEI storage.** A single key/value application-settings table (key text primary key, value text) with the key `initial_cert.tei`, read with a default of `126` when the row is absent. Chosen over a purpose-built singleton table (more schema for one value) and over seeding a row (a read-time default avoids a data migration). The table leaves room for later settings.

**D3 — TEI editing surface and permission.** A subdued form on the Reporting page, rendered only when the viewer is an administrator, with the server action re-checking `isAdministrator`. Placement matches the requested subtlety; the existing `reporting.manage` gate controls page access while the admin check controls editing. A dedicated permission was rejected as overkill for one rarely changed value.

**D4 — Shape check is non-blocking and lives at the step-advance boundary.** `wizardStepErrors` keeps its current empty-only rule (a missing number still blocks). The shape predicate is a separate function run when the instructor advances from the KBEMS step; a mismatch opens the acknowledgement dialog and advances only on acknowledgement. The predicate is deliberately excluded from `wizardStepErrors`, whose return value means "blocks". `assertKbemsDetails` keeps its empty-only server rule and stores the number as typed-normalized; the server does not shape-block, because the shape is advisory.

**D5 — Fire prefill suppression.** The prefill effect gains an initial-certification branch: when the course type is Initial certification it never seeds the number, and it clears a value already seeded from the first Fire subject's training code (a value equal to that code) so the Fire code is never carried into an initial-certification number. A staff-typed value that is not the Fire code is left untouched. Alternatives considered: clearing any value whenever initial certification is chosen (destroys deliberate entries) and leaving the Fire-seeded value to trip the soft warning (does not satisfy the "not pre-filled" requirement).

**D6 — Recent numbers are shared and derived.** `ClassCreationOptions` gains `recentInitialCertNumbers`: the distinct non-empty `classes.course_number` where `course_type = 'initial_certification'`, ordered by most recent class update, limited to five. The wizard renders them through `SearchSelect` with a pinned "type a new number" option, mirroring `curriculum-select.tsx`. Chosen over a managed catalog (no upkeep, matches "recently used") and over per-actor scoping (the request was for a shared list).

## Risks / Trade-offs

- [Changing the TEI makes existing numbers look malformed] → The shape check is advisory, so legacy and recent values remain selectable and creatable; the warning is acknowledged, not enforced.
- [A Fire-seeded value left in an Initial-certification field] → The soft warning surfaces it and the instructor can pick a recent number or correct it; no value is silently destroyed.
- [Shared recents expose numbers across instructors] → The numbers are state-assigned, non-sensitive values, and are already printed on completion certificates.
- [Uppercasing changes the stored value versus what was typed] → The shape is uppercase by definition; the stored and printed value is normalized.
- [Adding a settings table touches the migration ledger] → The migration is additive and guarded by the existing migration-integrity check; rollback drops the table.

## Migration Plan

1. Add the settings table in a new migration (additive).
2. Read the TEI through a settings service that defaults to `126` when the row is absent, so no data migration or seed is required.
3. Rollback: drop the settings table; the wizard falls back to the default TEI and the number becomes free text again.

## Open Questions

- Should the class edit form later gain the same soft shape check for parity? Deferred.
- Should the recent list exclude numbers whose prefix no longer matches the configured TEI? Left as-is (they still warn softly) pending feedback after use.

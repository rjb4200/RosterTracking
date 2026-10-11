## Context

The class-creation wizard is a client component (`class-creation-wizard.tsx`) that holds all wizard values in one `values` state object and validates each step through `wizardStepErrors` (`src/modules/classes/wizard-validation.ts`). On submit it serializes wizard state into hidden inputs; the creation service `createOpenClass` (`src/modules/classes/services.ts`) re-validates KBEMS details in `assertKbemsDetails`.

Steps are ordered Fire, KBEMS, MTU (`destination-steps.ts`), so when the KBEMS step renders, the Fire subject rows and their `trainingCodeId` values are already in state. The wizard already receives `trainingCodes: Array<{ id, code, title }>`. See `proposal.md` for motivation.

Today the KBEMS step renders the course-number `Input` only when `courseType === "initial_certification"`, and the hidden submit input is guarded by the same condition. The rule in both the client validator and `assertKbemsDetails` is already "required only for Initial certification".

## Goals / Non-Goals

**Goals:**
- Always offer the course number on the KBEMS step; required only for Initial certification.
- Non-initial: muted styling, still a normal editable input.
- Dual Fire+KBEMS: seed the field from the first Fire subject's training code.
- Keep server-side and client validation semantics unchanged.

**Non-Goals:**
- Changing the class edit form (`class-form.tsx`); behavior is create-only.
- Any database/schema change; `course_number` already exists.
- Continuously mirroring the Fire training code after the initial seed.

## Decisions

**1. One input, muted via class — never `disabled`.**
Render the course-number `Input` unconditionally on the KBEMS step. When `courseType !== "initial_certification"`, add a muted class (e.g. `text-muted-foreground`) and drop the required marker; the control stays focusable and editable. Chosen over `disabled` + an override toggle because the requested signal is "not required", not "not allowed", and a disabled control cannot satisfy "allow edits otherwise".

**2. Autofill source = first Fire subject's `trainingCode.code`.**
The value is the training code (e.g. `A0000`), resolved by looking up `subjects[0].trainingCodeId` in the `trainingCodes` prop. First subject matches the existing precedent where the class name derives from `subjects[0]`. Autofill applies whenever Fire and KBEMS are both selected, regardless of course type (a muted non-initial dual class is pre-filled and editable).

**3. Seed-once semantics via an untouched flag.**
Track `courseNumberTouched`. When the first Fire subject's training code is set/changed and the field is not touched, set `courseNumber` to that code. Once staff edit the field (or it is otherwise non-empty from a manual entry), stop seeding. This avoids a re-fill loop and honors "allow manual edits". Chosen over an `useEffect` that fills whenever empty (which would re-fill after a deliberate clear) and over continuous mirroring (rejected in the proposal).

**4. Validation and service rules stay as-is.**
`wizardStepErrors` already requires the course number only for `initial_certification`; `assertKbemsDetails` already throws only for `initial_certification`. Loosening render visibility does not change these rules, so neither module needs a rule edit. The server does not derive the course number from the Fire training code — the field is user-editable, so the wizard value is authoritative and a server-derived default would risk overriding a deliberate entry.

**5. Always serialize the course number.**
Remove the `values.courseType === "initial_certification"` guard on the hidden `courseNumber` input so a non-initial value submits. The hidden `courseType` input is already unconditional.

## Risks / Trade-offs

- [Muted styling reads as disabled] → Keep the control enabled and focusable; add a short "Optional" helper and ensure `aria-invalid`/labels remain correct. Verify the muted class does not imply a disabled control in the design system.
- [Autofill re-seeding over a manual edit] → Gate seeding on the untouched flag and seed only when the Fire training code changes, not on every render.
- [Stale value when course type flips] → Autofill is independent of course type, so no re-evaluation is required; the required/optional styling simply follows `courseType`.
- [Server accepts a blank non-initial value] → Intended: the certificate already leaves the field blank when absent; no behavioral regression.

## Migration Plan

No data or schema migration. Deploy as a normal code change; no rollback complexity beyond reverting the commit.

## Open Questions

- Exact muted affordance and helper copy (e.g. "Optional") — a presentation detail that can be settled during implementation without changing the specs or approach.

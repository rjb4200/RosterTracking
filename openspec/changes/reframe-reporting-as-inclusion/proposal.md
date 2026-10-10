## Why

The current model treats each reporting system's credentials as requirements that gate student sign-in: Fire requires FFN and KBEMS requires a KEMSIS ID, and the class resolves their union before attendance is confirmed. In practice anyone may attend a class and every attendee receives a completion certificate (the EMS division is a Training Entity Institution that may issue to anyone, KEMSIS number or not). The only real constraint is that **Fire Commission credits training hours only to attendees with a valid FFN**. Today an EMS-only attendee is wrongly blocked at sign-in on a combined class, and students are asked for a KEMSIS number they may not have.

## What Changes

- **BREAKING** — Student sign-in is no longer gated by credentials. Anyone may sign in and confirm attendance.
- Fire roster membership becomes an **eligibility rule**, not a sign-in requirement: only attendees with a **valid FFN** appear on the Fire Commission roster and receive Fire credit.
- KBEMS imposes no student credential requirement; **everyone** receives a certificate. KEMSIS becomes an optional, stored-but-not-required credential, joining NREMT and FEMA SID.
- FFN value format is standardized to `0000-0000` (4 digits, dash, 4 digits) for new student and staff entries. Existing test-only FFNs will be cleared separately; they are not backfilled or corrected by this change.
- A malformed FFN entered at student sign-in is **rejected** (not stored).
- **Fire class guard**: a Fire class cannot be created (or moved to Fire) unless its lead instructor **and** every assigned assisting instructor have a correctly formatted FFN on their staff profile.
- Changed-number recovery anchor changes from `prior phone + FFN/KEMSIS` to **prior phone + email**.
- Per-destination sign-in prompts: FFN when Fire is selected; KEMSIS and NREMT when KBEMS is selected (all optional, none required).
- Student-facing warning when a Fire-selected class proceeds without a valid FFN (no Fire credit), and staff-facing copy when the Fire class guard blocks creation.

## Capabilities

### New Capabilities
<!-- None: this change reframes existing reporting/credential behavior. -->

### Modified Capabilities

- `reporting-requirements`: Reframe from "required credentials collected at sign-in" to **report inclusion rules**; remove the KBEMS KEMSIS requirement and the union-blocks-sign-in semantics; Fire inclusion = valid FFN; KBEMS/MTU impose no student credential requirement.
- `credentials`: Add a per-type value-format rule for the FFN type (`0000-0000`) and validate supplied values.
- `student-identification`: Remove the credential gate; add per-destination optional prompts and malformed-FFN rejection; change the changed-number recovery anchor to prior phone + email.
- `attendance-sign-in`: Stop treating credentials as class-required; retain captured credential values and per-attendee report eligibility instead.
- `instructor-profiles`: Change the staff FFN rule to `0000-0000` (replacing digits-only/no-fixed-length).
- `class-creation-wizard`: Block Fire class creation when the lead or an assisting instructor lacks a valid FFN, with warning copy.
- `class-management`: Apply the same Fire/instructor FFN guard when reporting systems or instructors change on an existing class.
- `finalization-reporting`: Scope the Fire destination's population and workload counts to Fire-eligible (valid-FFN) attendees.
- `official-roster-pdfs`: Generate KFS-1A participant rows from the valid-FFN subset of the revision.

## Impact

Affected areas: public student sign-in workflow (identification, prompts, recovery, validation), class creation wizard and class management guards, staff profile FFN validation, finalization/reporting-queue counts, and KFS-1A roster generation. No new external dependencies. Existing test-only FFNs are not migrated; they do not qualify for Fire inclusion.

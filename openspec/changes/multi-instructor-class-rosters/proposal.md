# Proposal

## Why

Some classes are taught by more than two instructors. Live-burn Fire classes and EMS skill-station assessments commonly use a team, and some MTU classes must document three instructors for reporting. The current application models one lead and at most one assistant, so teams either cannot be recorded or lose members when instructors are edited. Splitting signing authority into a separate "Fire signer" role also makes the official roster ambiguous as soon as more than one assistant is involved.

## What Changes

- Replace the two-instructor limit with three explicit roles: one **lead instructor**, zero or one **assistant instructor**, and any number of **additional instructors**.
- The assistant is the second instructor of record: the person printed on the official KFS-1A and KBEMS-E16 roster. Additional instructors are team members recorded for access and reporting but are not printed in the official two-instructor fields.
- Make the lead instructor the sole signing authority for a class. The lead finalizes the roster, signs the roster, signs the Fire roster, and signs completion certificates.
- **BREAKING:** require the lead instructor of a Fire class to be fire-qualified. Remove the separate Fire signer role and the post-finalization Fire signature workflow for new classes. Legacy revisions keep their existing Fire signer and pending-signature behavior.
- Record every assigned instructor in the finalization snapshot, including additional instructors.
- Add an **Instructor Roster Supplement** PDF page when a class has more than two instructors. The supplement lists every instructor's name, FFN, instructor level, and roster role. It is appended to the KFS-1A Fire roster and the KBEMS-E16 certificate packet; it is not a state form and carries no signature lines.
- Continue to print only the lead and assistant in the official KFS-1A instructor fields and the KBEMS-E16 instructor field. The supplement documents the rest of the team.
- Count every assigned instructor in MTU reporting. The MTU Usage Summary's instructor count and instructor-hours total are derived from all assigned instructors; this change adds instructor names only to the supplement, not to the MTU summary layout.
- Preserve historical revisions, including revisions where an assistant signed Fire. No existing finalized revision is rewritten.
- Correct existing open Fire classes that have a non-fire lead before they can be edited or finalized. No automatic role reassignment is performed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-management`: instructor roles, unlimited additional instructors, fire-qualified lead rule, and instructor audit facts.
- `class-creation-wizard`: multi-instructor selection, assistant vs. additional roles, fire-qualified lead validation, and signer summary.
- `guided-roster-finalization`: instructor display/editing, lead-only finalization and signing, and legacy pending-signature presentation.
- `finalization-reporting`: all-instructor snapshot, lead-only Fire attestation for new revisions, and legacy revision compatibility.
- `official-roster-pdfs`: lead/assistant official fields, no new pending Fire roster, and the supplemental instructor page.
- `roster-signing`: single-signer model, Fire attestation at finalization, and legacy assistant-fire-signer support.
- `class-finalization-reminders`: lead-only reminders for new classes and legacy pending Fire signature reminders.
- `individual-training-notices`: lead-signed notices for new Fire revisions and legacy signer compatibility.
- `completion-certificates`: certificate email lists the full instructor team while the certificate itself remains lead-signed.
- `mtu-usage-summary`: instructor count and instructor hours include assistant and additional instructors.

## Impact

- Database: add an assistant role marker to `class_instructors`, add one-assistant uniqueness and role-exclusivity constraints, and backfill current non-lead rows as assistants. No limit is added to additional instructors.
- Class creation and editing: replace the single assistant selector with lead, assistant, and additional-instructor controls. Fire lead selection must require a valid FFN and Fire Instructor level.
- Fire validation and signing: replace the "at least one assigned instructor is fire-qualified" guard with a fire-qualified lead guard; remove the new-class Fire signer resolver and pending Fire signature state.
- Finalization: snapshot all instructors; the lead's certification satisfies the `roster` and, for Fire, `fire` scopes in one action.
- PDF generation: KFS-1A maps the lead to the Lead fields and the assistant to the Assisting fields; add the supplemental instructor page for classes with more than two instructors; E16 prints the two instructors of record.
- Legacy compatibility: retain rendering and signing for historical revisions with a non-lead Fire signer.
- Reporting: MTU summary instructor counts and instructor hours include all assigned instructors.
- Tests: unit, integration, PDF, and browser coverage for roles, role transitions, fire-qualified lead enforcement, supplements, legacy revisions, and MTU counts.
- Operations: production currently has only cancelled Fire classes, so the fire-qualified lead rule does not strand active production work; dev test fixtures may need role correction.

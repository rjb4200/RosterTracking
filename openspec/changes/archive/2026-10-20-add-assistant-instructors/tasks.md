## 1. Domain rules and services

- [x] 1.1 Add `isFireInstructor(profile)` (valid FFN `0000-0000` **and** instructor level 1/2/3) and `resolveFireSigner(instructors)` (fire-eligible lead, else fire-eligible assistant, else none) in `src/modules/classes`
- [x] 1.2 Replace `requireFireInstructorFfns` with a guard that requires at least one fire instructor in the assignment set that will exist after the write, and update its message
- [x] 1.3 Extend `createClass` input with an optional `assistantInstructorId`; insert a non-lead `class_instructors` row when present, reject an assistant equal to the lead, and apply the fire-instructor guard over lead + assistant
- [x] 1.4 Change `assignClassInstructor(…, isLead=true)` to replace the previous lead rather than demoting it into the assistant slot; add a set/clear assistant path that never changes the lead
- [x] 1.5 Reject an instructor holding both roles and validate the resulting assignment set atomically for the Fire guard
- [x] 1.6 Add storage for a Fire attestation against the finalization revision: signer, typed name, server timestamp, and attestation statement version
- [x] 1.7 Record the Fire attestation at finalization when the lead is the Fire signer, and append it later when the Fire signer is the assistant
- [x] 1.8 Refuse a duplicate Fire attestation, a signer who is not the resolved Fire signer, and any Fire attestation on a reopened or superseded revision
- [x] 1.9 Void a pending Fire attestation when a finalized class is reopened

## 2. Class creation wizard

- [x] 2.1 Add an optional assistant instructor picker on the **Class & schedule** step beside the lead picker, with an empty option and the lead excluded from its choices
- [x] 2.2 Show the assistant instructor, the resolved Fire signer, and the certificate signer in the review summary
- [x] 2.3 Submit `assistantInstructorId` as a hidden field and read it in `createClassAction`
- [x] 2.4 Update the Fire-step guidance to describe the fire-instructor rule rather than an FFN on every instructor

## 3. Edit and review surfaces

- [x] 3.1 Add replace-lead and set/clear-assistant controls on the class edit screen; label lead replacement so the previous lead's removal is clear
- [x] 3.2 Add the same controls on the class review screen while the class is open
- [x] 3.3 Show the pending Fire signature and the Sign Fire roster action on the review screen when the lead is not the Fire signer
- [x] 3.4 Keep the roster and class facts read-only while the Fire signer attests

## 4. Finalization and Fire attestation

- [x] 4.1 Keep `requireFinalizeAccess` lead-only; the Fire signer cannot finalize
- [x] 4.2 Capture the Fire attestation in the lead's finalization action when the lead is the Fire signer
- [x] 4.3 Capture the Fire attestation from the Fire signer's sign action when the lead is not the Fire signer
- [x] 4.4 Refuse to mark the Fire reporting destination `entered` until the Fire attestation exists
- [x] 4.5 Void a pending Fire attestation on reopen and require a fresh one on re-finalization

## 5. Official output

- [x] 5.1 Gate the KFS-1A on the Fire attestation and place the Fire signer in the Lead name/FFN/level/signature fields, with the non-signing instructor in the Assisting fields
- [x] 5.2 Gate the individual training notice on the Fire attestation and resolve its name, FFN, and signature from the Fire signer
- [x] 5.3 Keep the completion certificate on the class lead; do not change its signer

## 6. Dashboards

- [x] 6.1 Ensure the Fire signer sees the finalized class with the Sign Fire roster action on their dashboard, including when they are the assistant, and that non-signers are not offered the action

## 7. Tests

- [x] 7.1 Unit-test the fire-instructor predicate and `resolveFireSigner` across lead-fire, assistant-fire, both-fire, and neither-fire cases
- [x] 7.2 Integration-test creating a Fire class led by a non-fire instructor with a fire-qualified assistant, and blocking one with no fire instructor
- [x] 7.3 Integration-test replacing the lead (previous lead removed), setting/changing/clearing the assistant, the role guard, and fire-instructor retention
- [x] 7.4 Integration-test finalizing as the lead with the Fire attestation, and as the assistant signing the locked revision
- [x] 7.5 Integration-test the Fire reporting gate, the KFS-1A and notice gates, and the certificate remaining with the lead
- [x] 7.6 Integration-test reopening with a pending Fire attestation and re-finalizing
- [x] 7.7 End-to-end test an EMS-led Fire class with a fire assistant through Fire signature and document generation

## 8. Verification

- [x] 8.1 Run `npm run check` and `npm run verify` and resolve any failures
- [x] 8.2 Confirm `openspec validate add-assistant-instructors` passes
- [x] 8.3 Audit production Fire classes for a lead with an FFN but no certification level, and for classes with more than one non-lead assignment; record the backfill or reassignment plan
- [x] 8.4 Confirm the change is archived before `add-per-document-signing`, which generalizes the attestation model

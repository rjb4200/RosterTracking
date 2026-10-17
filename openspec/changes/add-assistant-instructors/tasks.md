## 1. Domain rules and services

- [ ] 1.1 Add `isFireInstructor(profile)` (valid FFN `0000-0000` **and** instructor level 1/2/3) and `resolveSigningInstructor(instructors)` (lead if it is a fire instructor, else the assistant if it is, else none) in `src/modules/classes`
- [ ] 1.2 Replace `requireFireInstructorFfns` with a guard that requires at least one assigned instructor who is a fire instructor, and update its message
- [ ] 1.3 Extend `createClass` input with an optional `assistantInstructorId`; insert a non-lead `class_instructors` row when present, reject an assistant equal to the lead, and apply the fire-instructor guard over lead + assistant
- [ ] 1.4 Add service support to set, change, and clear the single assistant instructor on an open class, reusing `assignClassInstructor(…, isLead=false)` plus a clear path
- [ ] 1.5 Guard instructor changes so a Fire class always retains a fire instructor, and reject assigning the lead as the assistant (and the assistant as the lead leaving the slot empty is allowed by vacating the assistant)

## 2. Class creation wizard

- [ ] 2.1 Add an optional assistant instructor picker on the **Class & schedule** step beside the lead picker, with an empty option and the lead excluded from its choices
- [ ] 2.2 Show the assistant instructor in the review summary when one is chosen
- [ ] 2.3 Submit `assistantInstructorId` as a hidden field and read it in `createClassAction`
- [ ] 2.4 Update the Fire-step guidance to describe the fire-instructor rule rather than an FFN on every instructor

## 3. Edit and review surfaces

- [ ] 3.1 Add add/change/remove controls for the assistant instructor on the class edit screen
- [ ] 3.2 Add the same assistant controls on the class review screen while the class is open

## 4. Signing and finalization

- [ ] 4.1 Change `requireFinalizeAccess` to admit the resolved signing instructor instead of strictly the `is_lead` row
- [ ] 4.2 Offer the finalize-and-sign action on the review screen only to the signing instructor, including when it is the assistant
- [ ] 4.3 Confirm the finalization revision records the signing instructor as signer for both the lead-signer and assistant-signer cases

## 5. Official output

- [ ] 5.1 In the KFS-1A fill, place the signing instructor in the Lead instructor name/FFN/level/signature fields and the non-signing instructor in the Assisting fields
- [ ] 5.2 Resolve the completion certificate instructor name and signature from the signing instructor
- [ ] 5.3 Resolve the individual training notice instructor name, FFN, and signature from the signing instructor

## 6. Dashboards

- [ ] 6.1 Ensure the signing instructor sees the awaiting-signature class with the review-and-finalize action on their workspace, including when they are the assistant, and that non-signing instructors are not offered the action

## 7. Tests

- [ ] 7.1 Unit-test the fire-instructor predicate and `resolveSigningInstructor` across lead-fire, assistant-fire, both-fire, and neither-fire cases
- [ ] 7.2 Integration-test creating a Fire class led by a non-fire instructor with a fire-qualified assistant, and blocking one with no fire instructor
- [ ] 7.3 Integration-test adding, changing, and removing the assistant on an open class, including the lead/assistant role guards and fire-instructor retention
- [ ] 7.4 Integration-test finalizing as the assistant signing instructor and asserting the revision signer, roster lead fields, certificate, and notice
- [ ] 7.5 End-to-end test creating a class with an assistant and finalizing as the assistant on the review screen

## 8. Verification

- [ ] 8.1 Run `npm run check` and `npm run verify` and resolve any failures
- [ ] 8.2 Update `openspec` state and confirm `openspec validate add-assistant-instructors` passes

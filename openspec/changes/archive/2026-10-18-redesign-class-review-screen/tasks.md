## 1. Confirm class step (step 1)

- [x] 1.1 Present the open-class review as three ordered steps: Confirm class, Review roster, Finalize & export, with the Confirm class and Review roster steps open and the finalize action in the last step.
- [x] 1.2 Present class details, instructors, sessions, and MTU usage as inline groups in the Confirm class step, each collapsed to a one-line summary with an edit affordance.
- [x] 1.3 Move session editing into the Confirm class step so a class's length is adjusted there, showing the class scheduled total.
- [x] 1.4 Propagate a raised scheduled total to active participants at the previous total (shared schedule write path, one transaction, per-row audit).
- [x] 1.5 Leave participants adjusted below the previous total unchanged; keep the per-participant bound unchanged.

## 2. Review roster step (step 2)

- [x] 2.1 Present the active attendance as a compact table: participant, status, credited hours, adjustment, actions.
- [x] 2.2 Expand a row to its detail only when the participant needs attention (invalid credit or missing reporting context); keep other rows compact.
- [x] 2.3 Show the removed attendance behind a collapsed affordance, and only when a participant was removed.
- [x] 2.4 Name each readiness issue by the participant instead of the attendance record identifier.

## 3. MTU capture on the Confirm class step

- [x] 3.1 Present MTU equipment, supplies, transport, and additional details as grouped collapsible sections in the Confirm class step.
- [x] 3.2 Save MTU usage from the Confirm class step (restore the reviewed save path), audited, without altering signed revision facts.
- [x] 3.3 Require recorded MTU usage at finalization instead of a separate confirm payload, and update the finalization service and its tests.
- [x] 3.4 Make MTU usage editable only while the class is open; changing it after finalization requires reopening.

## 4. Finalize & export step (step 3)

- [x] 4.1 Present the roster readiness, the certification, the signature, and the finalize action as one action block.
- [x] 4.2 Require only the certification and the signature to finalize (no draft, no editing, no second submission); withhold until the roster is ready.

## 5. Finalized and secondary sections

- [x] 5.1 Keep the finalized screen read-only: the finalized confirmation, roster, documents, delivery, notices, revision history, and the reopen path.
- [x] 5.2 Collapse the documents and revision-history sections behind summaries.
- [x] 5.3 Add step, roster-table, and grouped-section styles to `src/app/globals.css`.

## 6. Tests

- [x] 6.1 Test that raising the scheduled total credits participants who were at the previous total.
- [x] 6.2 Test that a participant adjusted below the previous total keeps their credited hours and reason.
- [x] 6.3 Test that a readiness issue names the participant rather than the attendance identifier.
- [x] 6.4 Test that the review screen presents the three steps for an open class.
- [x] 6.5 Test that the roster presents compact rows and expands only a row that needs attention.
- [x] 6.6 Test that a class presents the MTU groups once, in the Confirm class step.
- [x] 6.7 Test that finalizing requires certification and signature only, and is withheld without recorded MTU usage for an MTU class.

## 7. Verification

- [x] 7.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 7.2 Confirm `openspec validate redesign-class-review-screen --strict` passes.

## 1. Workspace shell

- [x] 1.1 Rebuild the open-class review screen as one post-class workspace: a review state with summary areas (Class & reporting, Schedule & hours, Instructors, Roster, MTU usage), readiness, and the finalization action, replacing the three-step layout.
- [x] 1.2 Give each summary area one editing affordance that opens only that area's editor, one area at a time, preserving the operator's place when an editor opens or closes.
- [x] 1.3 Refresh the summary and the readiness after an area is saved, before finalization is available.
- [x] 1.4 Keep the workspace usable on desktop, tablet, and phone — no horizontal scrolling at a phone-sized viewport.

## 2. Correction areas

- [x] 2.1 Class & reporting: the class-details editor (name, delivery, training site, host agency, reporting destinations, and EMS course details).
- [x] 2.2 Schedule & hours: the sessions with the running credited-hours total and the class scheduled total with the ran-long affordance.
- [x] 2.3 Instructors: the assignments with the lead marked, the lead-signs note, and the Fire qualification note while Fire is selected.
- [x] 2.4 Roster: compact rows (participant, status, credited hours, adjustment, actions) with a row expanding only when it needs attention; attendance removal; removed attendance behind a collapsed affordance only when a participant was removed.
- [x] 2.5 MTU usage: a single editor shown only for an MTU class, with no nested collapsible sections.

## 3. Readiness and finalization

- [x] 3.1 Actionable readiness: show Ready to finalize or Needs correction, list each blocker in plain language naming the participant or fact, and give each blocker a control that opens the area that resolves it.
- [x] 3.2 Report missing MTU usage as a readiness blocker that opens the MTU usage editor.
- [x] 3.3 Compact finalization panel offering the certification, the typed signature, and the finalize action only to the class's lead instructor, with no additional data entry unless a selected destination is missing information.

## 4. Documents, delivery, and the locked record

- [x] 4.1 Present one Documents & delivery section only after a finalized revision exists: sign-in record, audit log, KFS-1A roster, completion-certificate batch (KBEMS-gated), per-participant delivery state with resend and delivery exceptions, and Fire training notices with on-demand email; respect the generate permission; open documents inline.
- [x] 4.2 Present the locked finalized record read-only — signer, signed timestamp, revision, and outputs — with the revision history, and a clearly separated reopen action that requires a reason and retains prior revisions, offered only to operators who may reopen.

## 5. Tests

- [x] 5.1 Test that the workspace opens in a review state and shows one area editor at a time.
- [x] 5.2 Test that a readiness blocker names the participant or fact and opens the resolving area.
- [x] 5.3 Test that an MTU class shows one MTU editor and that missing usage blocks finalization; a non-MTU class shows none.
- [x] 5.4 Test that Documents & delivery is absent while the class is open and present, KBEMS-gated, after finalization.
- [x] 5.5 Test that finalizing requires only the certification and the signature.
- [x] 5.6 Test the class-runs-long propagation and the compact roster with expand-on-issue.

## 6. Verification

- [x] 6.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 6.2 Run the class-related integration tests and the review-screen browser spec; resolve any failures.
- [x] 6.3 Confirm `openspec validate post-class-review-workspace --strict` passes.

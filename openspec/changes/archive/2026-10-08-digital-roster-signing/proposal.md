## Why

Finalizing a class currently records no attestation of who verified the roster, and the printed KFS-1A leaves the lead-instructor signature and every attendee initials cell blank even though the system already holds the facts. The lead instructor should be the one who finalizes and signs, so a finalized Fire roster carries a named, timestamped electronic signature and each attendee's initials.

## What Changes

- **BREAKING** Restrict finalization to the class's **lead instructor**. Training Majors, Administrators, the class creator, and assisting instructors can no longer finalize a completed class.
- Capture a digital attestation when the lead instructor finalizes: an explicit certify action plus the signer's typed name, with the signer identity, server timestamp, and attestation text/version stored on the finalization revision.
- Render the lead instructor's electronic signature on the KFS-1A as a typed-name line, and print each attendee's **derived initials** (e.g., "AL") in the attendee initials column.
- Keep the assisting-instructor signature, the KBEMS-E16 signature fields, and the completion-certificate signature physically blank.
- Keep reopen available to Administrators only, and require a reopen note.
- Reopening and finalizing again captures a fresh signature on the new revision; the prior revision keeps its own.

## Capabilities

### New Capabilities
- `roster-signing`: capturing the lead instructor's electronic attestation at finalization and presenting it — plus derived attendee initials — on the Fire roster.

### Modified Capabilities
- `finalization-reporting`: finalization is restricted to the lead instructor and records a signed attestation; reopen is restricted to Administrators with a note.
- `guided-roster-finalization`: the review screen offers finalization only to the lead instructor and presents the signing step.
- `official-roster-pdfs`: the KFS-1A lead-instructor signature and attendee initials are no longer left blank; they are populated from revision facts.

## Impact

- Finalization access (`src/modules/classes/finalization.ts`) and the finalize/reopen actions and review-screen controls.
- Finalization revision facts: signer identity, signed-at timestamp, attestation text and version.
- Official-roster renderer (`src/modules/official-roster-pdfs`): the KFS-1A signature line and attendee initials are drawn at coordinates because the approved template has no such AcroForm fields.
- `official-roster-pdfs` mapping and verification notes, which currently promise signature/initial fields stay blank.

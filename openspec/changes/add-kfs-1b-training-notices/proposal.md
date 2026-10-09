## Why

The Kentucky Fire Commission requires an **individual training notice (KFS-1B)** for a firefighter who trains at an agency other than their own — for example, a Bath County firefighter attending a Winchester Fire class. Today the app defers KFS-1B entirely, so staff produce these notices by hand. Adding them closes the last deferred Fire output and completes the per-participant document set (Fire → training notices, EMS → completion certificates).

## What Changes

- Add the **KFS-1B** forms (Light-Yellow and White) to the versioned, checksummed template set.
- Generate **one KFS-1B per roster participant whose represented agency differs from the class host agency**, for any class that reports to Fire, from the finalized revision and **signed with the lead instructor's attestation**.
- **Email each qualifying participant their White KFS-1B automatically at finalization**, mirroring the certificate delivery path (durable outbox, post-commit dispatch, skip-if-unchanged, resend, delivery exceptions).
- **Append the Yellow KFS-1B pages** (one per qualifying participant) to the **Fire roster (KFS-1A) output** for view, download, and email.
- Capture the **class host agency** and each attendee's represented agency in the finalization snapshot so eligibility is decided from immutable revision facts.
- Leave `Agency_Selection` blank for now.

## Capabilities

### New Capabilities
- `individual-training-notices`: generate, sign, deliver, and append the per-firefighter KFS-1B for participants outside the class host agency.

### Modified Capabilities
- `official-roster-pdfs`: the KFS-1B forms join the versioned template set, and the KFS-1A output appends the Yellow notices.
- `finalization-reporting`: the finalization snapshot retains the class host agency and each attendee's represented agency.

## Impact

- **Assets**: two KFS-1B PDFs plus one shared field mapping and their SHA-256 checksums in `src/modules/official-roster-pdfs`.
- **Renderer**: a KFS-1B renderer that fills the student, instructor, subject rows, session, and signature fields.
- **Delivery**: a KFS-1B message on the shared brand shell, sent through the existing notifications outbox; per-participant delivery rows keyed to the revision.
- **Snapshot**: `finalization.ts` `buildSnapshot` gains the host agency and each attendee's represented agency.
- **Review screen**: the Fire roster row's output grows by the Yellow pages; qualifying participants appear in certificate-style delivery controls.
- **Docs**: the KFS-1B "deferred" notes in README/architecture are replaced.
- **Data**: no new tables; the snapshot shape grows.

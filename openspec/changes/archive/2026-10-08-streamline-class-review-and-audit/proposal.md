## Why

The completed-class review screen mixes two visual languages: the sign-in record and audit log are simple label-and-View rows, while the official rosters are heavier blocks with an always-visible recipient input. Reviewers also see a new audit entry every time a roster PDF is viewed, burying meaningful events, and the reopen control sits at the top beside finalization where it is easy to trigger by mistake.

## What Changes

- Unify the Documents section into one list: the class sign-in record, class audit log, KFS-1A roster, KBEMS-E16 roster, and completion certificates become peer rows with the same look. Rosters gain a progressive Email action whose recipient field appears only when requested. The completion-certificates row appears only when the revision reported to KBEMS.
- Move the reopen control out of the top Finalization section into a dedicated "Reopen roster" section at the bottom of the page, shown only to operators who may reopen. Finalization stays at the top.
- Collapse repeated official-output audit events: the class audit log represents official-roster generation once per actor per revision per form, and certificate generation once per actor per revision, instead of once per view. Email deliveries remain recorded per send.
- Keep every existing action reachable; nothing is removed.

## Capabilities

### New Capabilities
<!-- None: this change refines existing behavior. -->

### Modified Capabilities
- `guided-roster-finalization`: the review screen's document list (peer rows for sign-in record, audit log, both rosters, and KBEMS-only certificates), the progressive roster Email action, and the bottom "Reopen roster" section offered only to those who may reopen.
- `class-audit-log`: repeated official-roster and completion-certificate generation events are represented once per actor per revision (per form for rosters) rather than once per generation.

## Impact

- Review screen: `src/app/staff/(protected)/classes/[id]/review/page.tsx`, `finalization-controls.tsx`, `official-roster-controls.tsx`.
- Audit read path: `src/modules/class-audit-log/service.ts` (dedupe by actor/revision/form when assembling the log).
- No database schema change and no change to generated PDF content.

## Why

The class's scheduled hours are the hours of record: they appear on every completion certificate, in the certificate email, and on the individual training notice. The batch cover page is the one place they are missing — it lists each participant's individually credited hours instead, so a class scheduled for 5 hours whose participants were each credited 2 hours produces a cover that reads "2.00" next to certificates that read "5". Operators read that as a bug.

## What Changes

- State the class's scheduled hours in the header of the completion-certificate batch cover page, alongside the class, completion date, and participant count, using the same class-hours value the certificates already render.
- Leave the certificate pages, the certificate email, and the individual training notice unchanged — they already use the class's scheduled hours.
- Leave the cover page's per-participant credited-hours column unchanged: it reports each participant's earned credit, which can legitimately differ from the class hours.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `completion-certificates`: the admin batch cover page states the class's scheduled hours in its header, the same hours the certificates carry.

## Impact

- `src/modules/completion-certificates/service.ts` — add the class hours to the cover page header in `renderStudentListCover`, using the existing `certificateClassHours`.
- No change to certificate fields, the certificate email, the training notice, the values shown per participant, or any schema.
- Existing certificate tests cover the batch page count; a new assertion covers the cover header.

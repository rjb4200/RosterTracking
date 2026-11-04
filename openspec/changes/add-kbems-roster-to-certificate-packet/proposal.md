# Proposal

## Why

KBEMS classes produce completion certificates but no official class roster. Fire classes have the KFS-1A; a KBEMS-only class has only a generated certificate cover page, which is not an accepted roster form. The supplied KBEMS-E16 template is still available, and the Training Major needs one roster for every class.

## What Changes

- Re-enable the KBEMS-E16 roster as the roster document for classes that report to KBEMS.
- Put the E16 roster pages at the top of the completion-certificate packet, followed by the participant certificates.
- Include the E16 in the packet for every KBEMS class, including a class that also reports to Fire. Fire-only classes keep the KFS-1A and have no certificate packet.
- Fill the E16 from the finalized revision: course name, instructor, location, roster day, start time, end time, total hours, course description/objectives, and each attendee's name, KEMSIS ID, and affiliated service.
- Aggregate a class's one-day schedule for the E16: date is the roster day, start is the earliest session start, end is the latest session end, and total hours is the sum of session hours.
- Print the E16 electronic signatures from the recorded attestations: the instructor signature uses the roster signer's name, and each attendee signature uses that attendee's name only when the finalized revision records a confirmed sign-in attestation. Leave a signature line blank when the corresponding attestation is absent.
- Move the certificate cover page to the end of the packet and paginate it so no participant is omitted.
- Keep the existing certificate-batch access rule. The roster is visible to anyone who can already request the batch; no new permission is introduced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `official-roster-pdfs`: re-enable KBEMS-E16 as a generated form, define its finalized-revision fields, one-day schedule aggregation, and attestation-derived signatures, and keep it out of the standalone roster choices.
- `completion-certificates`: the admin certificate batch begins with the KBEMS-E16 roster for a KBEMS class and ends with a paginated cover page, with the existing per-participant certificates in between.

## Impact

- `src/modules/official-roster-pdfs/mappings.ts`: restore the E16 template mapping and signature-line coordinates.
- `src/modules/official-roster-pdfs/service.ts`: restore and update the E16 page filler for the one-day aggregate and attestation-derived signatures.
- `src/modules/classes/finalization.ts`: preserve the confirmed sign-in attestation timestamp in the signed snapshot.
- `src/modules/completion-certificates/service.ts`: prepend E16 pages to the batch and move/paginate the cover page.
- PDF and unit tests for E16 fields, signatures, packet order, pagination, and empty or large attendance.
- No database, migration, API-route, or permission changes.
- The standalone official-roster route continues to offer only the KFS-1A; the E16 is produced inside the certificate packet.

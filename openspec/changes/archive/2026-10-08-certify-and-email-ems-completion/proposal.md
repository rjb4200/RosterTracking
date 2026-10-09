## Why

KBEMS no longer accepts the EMS roster as proof of completion, so every EMS (KBEMS) class must instead issue each participant a signed completion certificate and deliver it to that participant. The app already renders per-participant certificates from a finalized revision but leaves the instructor signature blank, produces only an on-demand batch, and cannot email participants at all.

## What Changes

- **Sign the certificate** with the lead instructor's typed-name electronic signature, taken from the finalization revision's attestation instead of left blank.
- **Produce an admin batch**: a purpose-built student-list cover page followed by one certificate page per active participant, in a single PDF download.
- **Email each active participant** their own certificate when a class is finalized, through an outbox-backed delivery path that never blocks or rolls back finalization.
- **Skip unchanged sends**: a participant is not emailed again when a re-finalized revision would render the same certificate (ignoring its template version).
- **Resend on demand** to a student, optionally to a different address; missing-email participants are skipped and listed as delivery exceptions on the review screen.
- **Make student email mandatory**: new and returning regular students must hold an email (like FFN/KEMSIS), and guest sign-in collects a required email.
- **Retire the KBEMS-E16 roster output** wherever it is offered.
- Introduce a **reusable email capability** (Resend client, branded HTML templates, delivery records) intended for later messages beyond certificates.

## Capabilities

### New Capabilities
- `email-delivery`: outbox-backed outbound email with typed templates, per-recipient delivery records, resend, and content-fingerprint suppression.

### Modified Capabilities
- `completion-certificates`: certificates are electronically signed, offered as a roster-cover batch, and delivered per participant.
- `official-roster-pdfs`: the KBEMS-E16 form is retired as an official output.
- `guided-roster-finalization`: the documents list drops the KBEMS-E16 row, adds the certificate batch, and exposes delivery exceptions.
- `finalization-reporting`: the KBEMS queue item no longer offers a roster download.
- `students`: a student's email is required.
- `student-identification`: a regular student lacking an email is prompted to add one at sign-in.
- `attendance-sign-in`: guest sign-in collects a required email, retained for certificate delivery.

## Impact

- **Email foundation**: new `src/modules/notifications` (Resend client, HTML templates, `outbox`/`email_deliveries` schema, resend and fingerprint logic); the existing roster email is refactored onto the shared client.
- **Finalization**: `classes/finalization.ts` writes delivery rows and dispatches sends after commit without affecting the finalize transaction.
- **Certificates**: `completion-certificates/service.ts` gains signing, the student-list cover, single-participant rendering, and a content fingerprint; the finalization snapshot carries each participant's recipient email.
- **Schema**: `class_guests` gains an email column; `email_deliveries` is added; `students.email` is enforced at sign-in (column stays nullable for legacy rows).
- **Retirement**: `official-roster-pdfs` template set and renderer drop KBEMS-E16; the review screen, reporting queue, README, and verification notes stop offering it.
- **Access**: certificate batch, resend, and delivery-exception actions follow the official-roster rule (assigned lead instructor, Training Major, Administrator).
- **Config**: reuses the verified `noreply@winchesterfireems.com` sender and the server-only `RESEND_API_KEY`.

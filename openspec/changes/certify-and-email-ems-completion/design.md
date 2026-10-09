## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `completion-certificates/service.ts` already renders one certificate page per active participant from a decrypted finalization revision, reuses `readSnapshot`, and leaves `Instructor_Signature` blank. It emits a multi-page document with deterministic metadata.
- `snapshot.signature` already carries the lead instructor's typed name, signed-at timestamp, and attestation version from `roster-signing`; the certificate can render it.
- The certificate template exposes an `Instructor_Signature` AcroForm field (`official-roster-pdfs/mappings.ts`), currently listed in `blankFields`.
- Resend is a private `sendWithResend` function inside `official-roster-pdfs/service.ts`; there is no shared email module, no delivery table, and no queue/worker infrastructure. The app runs on Vercel (`@vercel/functions`), Next 16.
- `students.email` is nullable; `class_guests` has no email column; new-student registration always collects an email (`student-sign-in/requirements.ts`), but returning students are only asked for class-required fields.

## Goals / Non-Goals

**Goals:**
- Sign the certificate with the lead instructor's typed-name electronic signature.
- Produce the admin batch as a student-list cover plus one certificate page per participant.
- Deliver a personal certificate to each active participant at finalization through a reusable email capability.
- Suppress a repeat send when the certificate content is unchanged.
- Support resend, including to a different address, and surface undeliverable participants.
- Make participant email available for every regular student and every guest.
- Retire the KBEMS-E16 output cleanly.

**Non-Goals:**
- No cryptographic/PKI signature; the typed-name line matches the established KFS-1A pattern.
- No new email provider, no object storage of generated PDFs, no durable copy of certificate bytes.
- No general notification preferences, unsubscribe flow, or SMS.
- No email to a participant whose class is not an EMS (KBEMS) class.

## Decisions

### D1 — A dedicated `email-delivery` module with a durable outbox
Add `src/modules/notifications` with a Resend client wrapper, typed message templates, and an `email_deliveries` table. The existing roster email is refactored onto the shared client. Certificate sends are written as delivery rows in the same transaction that finalizes the class, then dispatched after commit.

- **Why**: keeps the external call out of the finalize transaction while preserving a durable record of intent, so finalization never fails because of mail; gives resend and future messages one home.
- **Dispatch**: after the finalize transaction commits, the action dispatches pending deliveries using Next.js `after()` so it does not block the response. A delivery that fails stays `failed` and is retryable.
- **Alternatives**: inline send inside the transaction (a mail failure would corrupt or block a valid finalize — rejected); an external queue service (no infrastructure exists and it is disproportionate — rejected).

### D2 — Per-participant content fingerprint suppresses unchanged sends
Each certificate delivery stores a content fingerprint computed from the certificate's meaningful values: participant name, class/course name, class hours, course type, course number, completion date, and instructor name. The template version and signature timestamp are excluded. When a class is reopened and finalized again, a participant whose new fingerprint equals their last successfully-sent fingerprint is marked `skipped` and not emailed.

- **Why**: a participant should only be contacted again when their certificate actually differs, not for a new revision number.
- **Alternatives**: always re-send on a new revision (spams participants — rejected); never re-send (misses genuine corrections — rejected).

### D3 — The certificate is signed from the revision's typed-name attestation
Populate the certificate's instructor signature with the finalization revision's attested signer name. If the approved template's `Instructor_Signature` is a fillable text field, set it; otherwise draw the typed name at the mapped coordinate, mirroring how `roster-signing` drew the KFS-1A signature when no field existed. Revisions finalized before signing have no signature and render the field blank.

- **Why**: reuses the already-captured attestation, keeps certificates consistent with the KFS-1A typed-name convention, and honors revision-immutability.
- **Alternatives**: an image/PKI signature (explicitly out of scope — rejected); always blank (the problem being solved — rejected).

### D4 — The batch is a generated student-list cover plus certificate pages
Compose one PDF: a first page generated with `pdf-lib` and a standard font listing the class and each active participant (name, agency, credited hours), followed by one certificate page per active participant. The cover is not a state form, so it needs no approved template or checksum.

- **Why**: gives the admin a self-contained record and index without reusing a form the state no longer accepts.
- **Alternatives**: reuse the KBEMS-E16 page as the cover (prints a retired form — rejected); no cover (loses the student list — rejected).

### D5 — Recipient email is captured at finalization and overridable on resend
The finalization snapshot gains a per-participant recipient email (regular students from `students.email`, guests from the new `class_guests.email`), stored inside the encrypted snapshot. Delivering uses the snapshotted address; resend may override with an operator-entered address without mutating stored profile data.

- **Why**: keeps delivery tied to revision facts and consistent with every other immutable output, while still allowing a one-off correction.
- **Alternatives**: read the live student email at send time (breaks revision immutability — rejected).

### D6 — Email is a base required field, not a reporting requirement
Email is always collected for new registration, requested for a returning student who lacks one, and required for guests, independent of any reporting system. `students.email` stays nullable at the database level for legacy rows; enforcement happens in the sign-in workflow.

- **Why**: certificate delivery needs an address for every participant, and email is not owned by a particular reporting destination.
- **Alternatives**: add email to each reporting requirement set (couples it to destinations — rejected); block legacy students entirely (needlessly hostile — rejected).

### D7 — Make student-list cover and certificate actions reuse the official-roster authority
Batch download, resend, and delivery-exception actions are permitted to the assigned lead instructor for their class and to Training Majors and Administrators for any finalized EMS class, matching `assertRosterAuthority`.

- **Why**: one access rule for all finalized-class outputs.
- **Alternatives**: a separate certificate-access rule (drift and inconsistency — rejected).

### D8 — Retire KBEMS-E16 at the output layer, keep the data model
Remove KBEMS-E16 from the template set, the certificate/roster render dispatch, the review documents list, and the reporting queue download; keep KBEMS as a reporting destination and keep the retired asset out of shipping output. Documentation and fixtures are updated accordingly.

- **Why**: the state no longer accepts the form, but KBEMS remains a valid destination with its own status queue.
- **Alternatives**: delete the asset and all references outright (harder to reverse, no benefit — rejected).

## Risks / Trade-offs

- **External email failure** → deterministic per-participant delivery rows marked `failed`; finalization is unaffected; the review screen exposes retry/resend.
- **Duplicate sends on retry or reopen** → a delivery is keyed by revision lineage, participant, and content fingerprint; an unchanged fingerprint is suppressed.
- **Guest or legacy email is personally identifiable** → stored inside the encrypted finalization snapshot, consistent with existing protected snapshot facts; audit records hold the plaintext recipient only after a successful send.
- **Very large class batch** → the cover keeps the roster readable; a single multi-page PDF remains valid, matching the existing roster approach.
- **Retiring KBEMS-E16 breaks existing tests/docs/links** → retire at the output layer and update fixtures, the review screen, queue, README, and verification notes in the same change.
- **Signature field type unknown** → verify the approved template field at build; fall back to coordinate drawing so the typed-name line always renders.

## Migration Plan

1. Add `class_guests.email` and the `email_deliveries` table; no backfill (legacy null e-mails surface as delivery exceptions).
2. Add the always-required email prompt for returning students and require email in guest sign-in.
3. Build `src/modules/notifications` and move the roster email onto the shared Resend client.
4. Capture recipient email in the finalization snapshot; sign the certificate.
5. Add the student-list cover, single-participant render, and content fingerprint.
6. Enqueue delivery rows during finalization and dispatch after commit; add resend and the delivery-exceptions list to the review screen.
7. Retire the KBEMS-E16 output across the renderer, documents list, and reporting queue; update docs.
8. **Rollback**: revert the commit; new columns and tables are additive, the retired form is restorable, and no revision facts are rewritten.

## Open Questions

- The exact visual design of the branded HTML email template; safe to refine after implementation without changing behavior.

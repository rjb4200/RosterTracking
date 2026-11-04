# Design

## Context

See proposal.md — Why. The KBEMS-E16 template (`kbems-e16-september-2012.pdf`) is still tracked, but its mapping and generator were removed in `b85e7dd` when EMS completion certificates were introduced. The certificate batch currently renders a generated student-list cover followed by one certificate per participant; the cover stops after roughly 22 rows.

The finalization revision already preserves the class name, objectives, one-day subject components, attendance, credential snapshots, and the roster signature. It does not yet preserve each attendee's attestation confirmation in the E16-facing attendance snapshot, even though the finalization query already joins `attendanceAttestations` and reads `confirmedAt`. The certificate batch is generated on demand from that revision and no bytes are retained.

## Goals / Non-Goals

**Goals:**
- Restore the E16 as a generated roster document for KBEMS classes.
- Make the E16 the first pages of the existing certificate batch, with the cover moved to the end and paginated.
- Use one-day aggregate schedule facts so the E16 matches the app's single-roster-day model.
- Print the instructor and attendee signatures from recorded attestations.
- Keep the existing certificate-batch authority and keep the roster out of participant emails.

**Non-Goals:**
- No standalone E16 document action or API route.
- No database, migration, permission, or email-template changes.
- No separate typed-signature capture at login and no change to the approved E16 template.
- No change to KFS-1A or individual training notice output.
- No schedule simplification in this change; the E16 aggregates the current subject components.

## Decisions

### Restore the removed E16 mapping and filler

Reintroduce the E16 template mapping (16 attendee rows, landscape page, page number/count fields) and a page filler adapted from `b85e7dd^`. Keep the tracked template and its checksum. Reusing the prior implementation avoids redrawing an agency form and preserves the known field coordinates.

Alternative considered: render a new roster page from scratch. Rejected because the E16 is an official form and the supplied template is already versioned.

### Treat the E16 as an embedded packet document

The E16 is generated only as part of the KBEMS certificate packet. It is not added to `OFFICIAL_ROSTER_FORMS` or the standalone roster route, so staff still see one certificate-batch action rather than two roster-document actions.

Alternative considered: expose E16 as a second standalone official roster. Rejected because the requested use is the packet, and a separate action would duplicate the access and delivery surface.

### Aggregate the one-day schedule

Populate the E16 date with the roster day, start with the earliest subject start, end with the latest subject end, and total hours with the sum of subject credited hours. This fits the form's single date/time block and the existing same-day rule, and avoids choosing one session when a class has two subjects.

Alternative considered: use the first component's times and hours. Rejected because it understates a dual-subject class and would not match the certificates' class total.

### Print all attendees with KEMSIS IDs

The E16 uses the KBEMS inclusion rule: every active attendee appears, with name, KEMSIS ID, and affiliated service. A missing KEMSIS ID leaves the field blank rather than dropping the attendee. The roster paginates with 16 rows per page.

Alternative considered: use the Fire-eligible subset. Rejected because KBEMS includes every attendee.

### Sign the E16 from recorded attestations

The E16 has static signature lines but no AcroForm signature fields. Draw the recorded roster signer's name on the instructor line and each active attendee's name on that attendee's line only when the revision records a confirmed sign-in attestation. Preserve the per-attendee confirmation time as `attestedAt` on `SnapshotAttendance` from the existing `attendanceAttestations.confirmedAt` join at finalization. A manual or legacy attendance row without an attestation leaves its signature line blank.

Render the names with the bundled Allura signature face over the template's signature lines, fitting each name to the line. Add the signature-line coordinates to the E16 mapping; keep the approved PDF and its fields unchanged.

Alternative considered: add a separate typed-signature field at login. Rejected because the selected behavior is the attested name, and a new field would require login, schema, and UI changes. Alternative considered: modify the approved E16 to add signature fields. Rejected because it changes the official form. Alternative considered: print initials. Rejected because an initial is a different claim from the attested name.

### Packet order: roster, certificates, paginated cover

The batch begins with the E16 pages, then the certificate pages, then the generated cover. The cover is paginated with repeated headers and every participant listed once.

Alternative considered: keep the cover first and insert the roster after it. Rejected by direction and because it puts a non-official summary ahead of the official roster.

### Keep the existing access rule and individual emails unchanged

The packet remains available to an assigned instructor, Training Major, or Administrator under the existing certificate authority. Individual certificate emails continue to render a single participant certificate and never include the roster, so KEMSIS IDs are not emailed to participants.

Alternative considered: gate the roster to Training Majors only. Rejected as unnecessary complexity; a new permission or a split packet would be required.

## Risks / Trade-offs

- [The September 2012 E16 may not be the current accepted form] → Keep the template versioned and replace the asset/mapping if KBEMS supplies a newer form; no data model change.
- [A class has more attendees than one E16 page] → Reuse the 16-row page capacity and paginate with page numbers; test overflow.
- [The cover page previously truncated] → Paginate the cover with repeated headers and test a class larger than one page.
- [Fire + KBEMS classes get both a KFS-1A and an E16] → Accepted redundancy; the KFS-1A remains the Fire document and the E16 is the KBEMS roster inside the packet.
- [An attested attendee name is not a distinct handwritten signature] → The sign-in attestation remains the evidence; the printed name is gated by that attestation and stays blank without it.
- [Legacy or manual attendance has no confirmation timestamp] → Leave attendee signatures blank; no backfill.

## Migration Plan

1. Restore the E16 mapping and generator, including signature-line coordinates.
2. Preserve each attendee's confirmed attestation timestamp in the signed snapshot.
3. Draw the instructor and attendee signatures from those attestations.
4. Add the E16 pages to the certificate batch and move/paginate the cover.
5. Add unit and PDF tests; validate the packet order, field values, and signature boundaries.
6. Deploy the code. New revisions carry `attestedAt`; older revisions render blank attendee signatures. No database migration or backfill is required.
7. Rollback: revert the code change; existing revisions and certificates are unaffected.

## Open Questions

- Confirm with KBEMS that the September 2012 E16 is still the accepted roster form. If not, replace the template and mapping before release.

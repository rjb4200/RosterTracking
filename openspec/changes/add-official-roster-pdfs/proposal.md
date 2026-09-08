## Why

Finalized roster revisions need printable, agency-specific records generated from their immutable facts. The supplied Kentucky Fire Commission KFS-1A (October 2023) and KBEMS-E16 roster forms define the initial approved outputs; KFS-1B and FEMA outputs remain deferred.

## What Changes

- Generate a KFS-1A in-house training roster from a finalization revision, including class, instructor, component, and attendee facts.
- Generate a KBEMS-E16 continuing-education roster from a finalization revision, including attendee service information and required roster pages.
- Preserve official source templates and a versioned field-mapping manifest as application assets; generate PDFs by filling approved templates rather than recreating the forms from screenshots.
- Generate PDFs on demand from source templates for a unified staff view, print, download, and email workflow without storing generated files or artifact metadata.
- Provide Training Major and Administrator workflows for any finalized class and assigned-instructor workflows for their own finalized classes.
- Send on-demand PDF attachments through Resend from `noreply@winchesterfireems.com` to a staff-entered recipient and audit the plaintext recipient address without retaining PDF bytes.
- Add fixture-based PDF mapping and multi-page coverage using the supplied KFS-1A and KBEMS-E16 references.
- Defer KFS-1B individual Training Notice generation to GitHub issue #1 and defer FEMA until an approved current form is supplied.

## Capabilities

### New Capabilities
- `official-roster-pdfs`: Generate KFS-1A and KBEMS-E16 PDFs on demand from finalized roster revisions.

### Modified Capabilities
- `finalization-reporting`: Permit authorized roster delivery actions to use immutable finalization revisions without changing reporting destination status.

## Impact

- Adds Resend email delivery, class-scoped instructor authorization, on-demand preview/print controls, audit events, staff UI, and automated visual/field-mapping tests.
- Uses the existing finalized revision snapshots as the exclusive source for generated form content.
- Does not submit reports to Fire, KBEMS, or FEMA, generate KFS-1B notices, or introduce a FEMA form.

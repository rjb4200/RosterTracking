## Context

See proposal.md for motivation. Phase 7 stores an encrypted finalization snapshot and reporting rows, but no generated files or private object storage. The supplied KFS-1A October 2023 and KBEMS-E16 September 2012 PDFs provide the initial form layouts. KFS-1A has roster rows and initials/signature lines; KBEMS-E16 has roster rows, page numbering, and student/instructor signature lines.

## Goals / Non-Goals

**Goals:**
- Fill approved KFS-1A and KBEMS-E16 form fields from a single finalization revision.
- Generate downloadable PDFs without allowing mutable source records to alter their content.
- Cover multi-page output and field placement with fixtures based on the supplied source forms.

**Non-Goals:**
- KFS-1B individual Training Notice generation; it is tracked in GitHub issue #1.
- FEMA form generation or external agency submission.
- Treating an attendance attestation as a handwritten signature or initial.
- Retaining generated PDF bytes or attaching roster contents to audit events.

## Decisions

### Fill approved PDF templates rather than redraw forms

Keep the supplied KFS-1A and KBEMS-E16 PDFs as versioned source-template assets and overlay mapped text with `pdf-lib`. A form-mapping manifest will define coordinates, font sizing, page capacity, and static form version for each template. This preserves official appearance and allows later template replacement without reimplementing layout. Rendering HTML or rebuilding the form with canvas/PDF drawing was rejected because it risks visual drift from agency forms.

### Generate from decrypted finalized snapshots in a server-only service

The generator will resolve and decrypt only the selected finalization revision server-side, transform it into form-specific view models, and never query mutable student, class, agency, or credential records for form content. The browser receives only a download response for an already-generated artifact. This preserves historical consistency and prevents protected values from entering client state.

### Leave signature and initials fields physical

Existing electronic attendance attestations are not a substitute for the signature/initial fields on KFS-1A or KBEMS-E16. The mapped templates will intentionally leave these fields blank. This matches the supplied forms and avoids representing an attestation as an agency-approved signature.

### Render once per requested delivery method without persistence

Generate the PDF in the server request, use the same renderer for inline preview, browser print, download, and Resend attachment delivery, then discard the bytes. The immutable finalization revision and versioned source template are the durable inputs; no object storage, artifact metadata, or generated-file history is needed. Set deterministic PDF metadata so repeated requests for the same form render the same content and layout. Retaining generated PDFs was rejected because staff need reproducible forms, not separately retained copies.

### Authorize department staff and assigned instructors

Training Majors and Administrators can act on any finalized roster. Instructors can act only when assigned to the roster's class. The staff revision-history experience will show preview, print, download, and email actions. The generator will not update Fire, KBEMS, or FEMA reporting status; staff record those outcomes separately.

### Deliver emails through Resend

Use the server-only `RESEND_API_KEY` to send generated PDF attachments from `noreply@winchesterfireems.com`. The email form accepts an entered recipient, validates it server-side, and sends no authenticated application URL. Record a plaintext recipient address and non-sensitive delivery facts in the audit log after Resend accepts the request. The email provider and recipient may retain the attachment; the application does not.

## Risks / Trade-offs

- [Agency form acceptance rules may differ from the supplied references] → retain source/template versions, validate output with representative fixtures, and require a final staff visual approval before releasing a new template version.
- [Long attendee lists overflow a page] → use template-specific capacity and page cloning with explicit page numbering, verified by overflow fixtures.
- [Protected credential values are needed for a form] → decrypt only within server-side generation and avoid logging values, URLs, or artifact contents.
- [A future template changes coordinates] → add a new template version and mapping; future downloads use the approved version selected by the application.
- [PDF generation or Resend delivery fails] → return a recoverable staff error without leaving application-held PDF bytes or a successful-delivery audit record.
- [Recipient typo sends sensitive roster data to the wrong person] → require explicit recipient entry and a final confirmation action before delivery; retain the plaintext recipient audit fact for operational follow-up.

## Migration Plan

1. Add the PDF dependency, source-template assets, and mapping manifests without changing historical revisions.
2. Generate and visually compare fixture outputs for KFS-1A and KBEMS-E16, including overflow pages.
3. Configure the verified Resend sender and server-only API key, then release authorized preview, print, download, and email controls after template verification.
4. Roll back application access if needed; no generated files require cleanup.

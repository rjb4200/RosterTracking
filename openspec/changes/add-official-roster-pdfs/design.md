## Context

See proposal.md for motivation. Phase 7 stores an encrypted finalization snapshot and reporting rows, but no generated files or private object storage. The supplied KFS-1A October 2023 and KBEMS-E16 September 2012 PDFs provide the initial form layouts. KFS-1A has roster rows and initials/signature lines; KBEMS-E16 has roster rows, page numbering, and student/instructor signature lines.

## Goals / Non-Goals

**Goals:**
- Fill approved KFS-1A and KBEMS-E16 form fields from a single finalization revision.
- Retain an auditable, downloadable official-record artifact without allowing mutable source records to alter it.
- Cover multi-page output and field placement with fixtures based on the supplied source forms.

**Non-Goals:**
- KFS-1B individual Training Notice generation; it is tracked in GitHub issue #1.
- FEMA form generation or external agency submission.
- Treating an attendance attestation as a handwritten signature or initial.
- Editing a generated PDF or changing a prior artifact after generation.

## Decisions

### Fill approved PDF templates rather than redraw forms

Keep the supplied KFS-1A and KBEMS-E16 PDFs as versioned source-template assets and overlay mapped text with `pdf-lib`. A form-mapping manifest will define coordinates, font sizing, page capacity, and static form version for each template. This preserves official appearance and allows later template replacement without reimplementing layout. Rendering HTML or rebuilding the form with canvas/PDF drawing was rejected because it risks visual drift from agency forms.

### Generate from decrypted finalized snapshots in a server-only service

The generator will resolve and decrypt only the selected finalization revision server-side, transform it into form-specific view models, and never query mutable student, class, agency, or credential records for form content. The browser receives only a download response for an already-generated artifact. This preserves historical consistency and prevents protected values from entering client state.

### Leave signature and initials fields physical

Existing electronic attendance attestations are not a substitute for the signature/initial fields on KFS-1A or KBEMS-E16. The mapped templates will intentionally leave these fields blank. This matches the supplied forms and avoids representing an attestation as an agency-approved signature.

### Use private branchable object storage and append-only metadata

Create a private object-storage bucket and store each generated PDF under a random immutable key. Add roster-artifact metadata keyed to finalization revision and containing form/template versions, checksum, byte size, actor, and time. A repeat generation creates another retained artifact rather than overwriting the prior file. Storing PDF bytes in Postgres was rejected because object storage is better suited to immutable binary records and downloads.

### Make generation a Major/Admin workflow

Require the reporting authority used for official reporting tasks: Training Major or Administrator. The staff revision-history/reporting experience will show available forms and retained artifacts. The generator will not update Fire, KBEMS, or FEMA reporting status; staff record those outcomes separately.

## Risks / Trade-offs

- [Agency form acceptance rules may differ from the supplied references] → retain source/template versions, validate output with representative fixtures, and require a final staff visual approval before releasing a new template version.
- [Long attendee lists overflow a page] → use template-specific capacity and page cloning with explicit page numbering, verified by overflow fixtures.
- [Protected credential values are needed for a form] → decrypt only within server-side generation and avoid logging values, URLs, or artifact contents.
- [A future template changes coordinates] → add a new template version and mapping; never alter a prior artifact.
- [Private artifact storage is unavailable in a deployment] → fail generation before recording metadata and show a recoverable staff error.

## Migration Plan

1. Add the PDF dependency, source-template assets, mapping manifests, private bucket, and additive artifact metadata schema.
2. Deploy database/storage changes and seed approved template definitions without changing historical revisions.
3. Generate and visually compare fixture outputs for KFS-1A and KBEMS-E16, including overflow pages.
4. Release Major/Admin generation and download controls after template verification.
5. Roll back application access if needed; retained artifacts and metadata remain immutable records.

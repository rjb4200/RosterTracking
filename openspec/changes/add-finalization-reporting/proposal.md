## Why

Completed classes need a durable, historically accurate record before reporting and official roster generation can begin. Phase 7 locks finalized attendance facts into immutable revisions while giving authorized staff a controlled correction and reporting-status workflow.

## What Changes

- Create immutable finalization revisions with complete class, instructor, attendance, agency, credit, attestation, and reporting snapshots.
- Lock normal class and roster editing after finalization.
- Allow authorized staff to reopen a finalized class only with a retained reason and create later revisions without overwriting prior revisions.
- Add independent Fire, KBEMS, and FEMA reporting statuses, pending and needs-correction queues, and retained reporting submission metadata.
- Allow assigned instructors to finalize and reopen their classes; limit reporting-status updates to Training Majors and Administrators.
- Add staff workflows and coverage for finalization, reopen, revision history, and reporting updates.

## Capabilities

### New Capabilities
- `finalization-reporting`: Immutable roster revisions, reporting-status workflow, correction queues, and reporting audit facts.

### Modified Capabilities
- `class-management`: Finalized classes lock normal editing and require authorized, reasoned reopening before corrections.

## Impact

- Adds finalization revision, snapshot, reporting-status, and correction metadata through additive migrations.
- Extends class lifecycle authorization, roster read models, staff class pages, and audit events.
- Uses current class, instructor, attendance, attestation, requirement-snapshot, agency, course, site, and training-code records as finalization inputs.
- Defers official form mapping, PDF generation, object storage, and agency form acceptance rules to Phase 8.

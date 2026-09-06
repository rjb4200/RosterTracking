# Architecture

## Finalization reporting

Finalization is a class-level transaction. It locks the class, revalidates the roster, captures an encrypted snapshot of class, instructor, attendance, agency, credit, attestation, and reporting-requirement facts, then creates the next immutable revision. Database uniqueness on `(class_id, revision_number)` and update/delete-blocking rules preserve revision lineage.

Reopens are append-only records tied to the prior revision. They return a class to the open correction workflow; completing and finalizing it creates a later revision rather than modifying history. Reporting status rows are destination-specific and are independently queued as `pending` or `needs_correction`.

Assigned instructors can finalize and reopen only their assigned classes. Training Majors and Administrators also have lifecycle access and are the only roles allowed to update Fire, KBEMS, and FEMA reporting destinations.

## Official roster artifacts

KFS-1A October 2023 and KBEMS-E16 September 2012 are rendered server-side from decrypted finalization-revision snapshots, then retained in private object storage under random immutable keys. `official_roster_artifacts` stores the form/template version, SHA-256 checksum, byte size, actor, time, and revision reference after storage succeeds. Database rules prevent artifact updates and deletes. Staff clients receive only artifact history metadata and a same-origin authorized download response, never snapshot facts or storage keys.

Template mappings are owned with their checked-in source PDF in `src/modules/official-roster-pdfs`. Any revised official form requires a new asset/version/checksum, mapping review, representative and overflow fixture review, and approval before use. KFS-1B remains in GitHub issue #1; FEMA remains out of scope. Physical signature and initial fields are intentionally not populated by attendance attestations.

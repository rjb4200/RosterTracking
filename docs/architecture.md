# Architecture

## Finalization reporting

Finalization is a class-level transaction. It locks the class, revalidates the roster, captures an encrypted snapshot of class, instructor, attendance, agency, credit, attestation, and reporting-requirement facts, then creates the next immutable revision. Database uniqueness on `(class_id, revision_number)` and update/delete-blocking rules preserve revision lineage.

Reopens are append-only records tied to the prior revision. They return a class to the open correction workflow; completing and finalizing it creates a later revision rather than modifying history. Reporting status rows are destination-specific and are independently queued as `pending` or `needs_correction`.

Assigned instructors can finalize and reopen only their assigned classes. Training Majors and Administrators also have lifecycle access and are the only roles allowed to update Fire, KBEMS, and FEMA reporting destinations.

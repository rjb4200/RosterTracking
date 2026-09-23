## 1. Class EMS course details

- [x] 1.1 Add `course_type` (check-constrained) and `course_number` to `classes`
- [x] 1.2 Backfill `course_type` to `continuing_education` and leave `course_number` empty
- [x] 1.3 Capture course type and course number on the KBEMS step
- [x] 1.4 Persist the values while open or completed and preserve them at finalization

## 2. Certificate template and renderer

- [x] 2.1 Add the certificate PDF to the versioned template set with its checksum and template version
- [x] 2.2 Extract the shared snapshot reader and authority check for reuse
- [x] 2.3 Render one certificate page per active participant with all eight fields, leaving the signature blank
- [x] 2.4 Compose the instructor title/course line as `<course type> – <course name>`

## 3. Access and delivery

- [x] 3.1 Allow an assigned instructor, Training Major, or Administrator to generate certificates for a finalized revision
- [x] 3.2 Deny unrelated instructors without disclosing content
- [x] 3.3 Offer the certificate action only for revisions whose class reported to KBEMS
- [x] 3.4 Write the generation audit event, including the blank-signature flag
- [x] 3.5 Do not retain generated certificate bytes

## 4. Verification

- [x] 4.1 Unit tests for field population, name handling, and the composed title/course line
- [x] 4.2 Integration tests for finalized-only generation, access control, and the audit record
- [x] 4.3 Browser coverage for generating and downloading certificates
- [x] 4.4 Run `npm run check` and `npm run build`

## 1. Class EMS course details

- [ ] 1.1 Add `course_type` (check-constrained) and `course_number` to `classes`
- [ ] 1.2 Backfill `course_type` to `continuing_education` and leave `course_number` empty
- [ ] 1.3 Capture course type and course number on the KBEMS step
- [ ] 1.4 Persist the values while open or completed and preserve them at finalization

## 2. Certificate template and renderer

- [ ] 2.1 Add the certificate PDF to the versioned template set with its checksum and template version
- [ ] 2.2 Extract the shared snapshot reader and authority check for reuse
- [ ] 2.3 Render one certificate page per active participant with all eight fields, leaving the signature blank
- [ ] 2.4 Compose the instructor title/course line as `<course type> – <course name>`

## 3. Access and delivery

- [ ] 3.1 Allow an assigned instructor, Training Major, or Administrator to generate certificates for a finalized revision
- [ ] 3.2 Deny unrelated instructors without disclosing content
- [ ] 3.3 Offer the certificate action only for revisions whose class reported to KBEMS
- [ ] 3.4 Write the generation audit event, including the blank-signature flag
- [ ] 3.5 Do not retain generated certificate bytes

## 4. Verification

- [ ] 4.1 Unit tests for field population, name handling, and the composed title/course line
- [ ] 4.2 Integration tests for finalized-only generation, access control, and the audit record
- [ ] 4.3 Browser coverage for generating and downloading certificates
- [ ] 4.4 Run `npm run check` and `npm run build`

## 1. Template and artifact foundation

- [x] 1.1 Add `pdf-lib` and preserve the supplied KFS-1A October 2023 and KBEMS-E16 September 2012 PDFs as versioned source-template assets with recorded checksums.
- [x] 1.2 Define template mapping manifests for KFS-1A and KBEMS-E16, including page capacity, field coordinates, typography, static version, and intentionally blank signature/initial fields.
- [x] 1.3 Remove official-roster artifact metadata schema, migration, and storage configuration; retain only versioned source-template assets.

## 2. PDF generation and retention

- [x] 2.1 Build server-only finalization snapshot readers and form-specific view models that use only preserved revision facts.
- [x] 2.2 Implement KFS-1A generation with class, lead/assisting instructor, component, attendee FFN/name/hours, and intentionally blank initials/signature fields.
- [x] 2.3 Implement KBEMS-E16 generation with course, instructor, location, session timing, objectives, attendee name/KEMSIS ID/service, and intentionally blank signature fields.
- [x] 2.4 Add template-specific pagination, page context, and page numbering so every finalized attendee appears exactly once.
- [x] 2.5 Make the on-demand renderer deterministic and reuse it for preview, print, download, and Resend attachments without object upload, metadata writes, or generated-file retention.

## 3. Staff workflows

- [x] 3.1 Add revision-scoped authorization so Major/Admins can act on any class and assigned instructors can act only on their own classes.
- [x] 3.2 Add accessible on-demand preview, print, download, and email controls with recipient entry and explicit send confirmation.
- [x] 3.3 Integrate Resend with server-only configuration, `noreply@winchesterfireems.com`, PDF attachments, and plaintext-recipient audit events.

## 4. Tests and verification

- [x] 4.1 Add unit and integration coverage for role/class-scoped authorization, deterministic rendering, email validation, Resend success/failure, and plaintext recipient audit facts.
- [x] 4.2 Add fixture-based PDF and Playwright coverage proving consistent preview, print, download, and email output paths.
- [x] 4.3 Document the verified Resend sender, server-only key configuration, recipient-data handling, physical signature/initial requirements, and provider-retention boundary.
- [x] 4.4 Run lint, typecheck, unit/integration/E2E tests, PDF fixture checks, production build, and strict OpenSpec validation; resolve all failures.

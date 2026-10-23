## Why

Automatically emailed completion certificates still show a black screen or fail to load on iPhone, even after the attachment is correctly sent as `application/pdf`. The latest emailed certificate retains a template-level embedded C2PA `Content Credentials` file and duplicate catalog, while the working fire roster and admin certificate batch are copied into clean PDF documents. Mobile PDFKit is the client that fails.

## What Changes

- Generate each individual emailed or resent certificate into a fresh PDF document, matching the clean-output path already used by the certificate batch and fire roster.
- Preserve the certificate content, fonts, signature, logo, and page layout while dropping the template's catalog-level embedded files and orphan catalog.
- Add regression coverage that an individual certificate PDF has one document catalog and no embedded `Content Credentials`/C2PA attachment.
- No change to certificate facts, signature selection, email templates, attachment media types, or the admin batch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `completion-certificates`: individual certificate PDFs must be emitted as clean standalone documents that mobile viewers can open, without template-level embedded files or duplicate catalogs.

## Impact

- `src/modules/completion-certificates/service.ts`, primarily `renderCertificateForParticipant`
- Completion-certificate unit and integration coverage
- No database, migration, email-delivery, or API-contract changes
- Needs a manual iPhone verification after deployment

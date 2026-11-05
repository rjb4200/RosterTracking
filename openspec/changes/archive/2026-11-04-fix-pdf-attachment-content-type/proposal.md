## Why

Recipients report that automatically emailed completion certificates do not open on iPhone, even though the same attachment opens on a computer. The certificate email currently leaves the PDF attachment without a media type, so Resend sends it as `application/octet-stream`; desktop clients often fall back to the `.pdf` filename, while iOS Mail and Quick Look are stricter. The same omission exists on the other PDF emails.

## What Changes

- Send completion certificate attachments with `Content-Type: application/pdf`.
- Send individual training notice attachments with `Content-Type: application/pdf`.
- Send official roster attachments with `Content-Type: application/pdf`.
- Add regression coverage that the outbound attachment payload carries `content_type: application/pdf` for each PDF-producing email path.
- Keep the existing filename, bytes, inline logo, and delivery audit behavior unchanged.
- Treat this as separate from the signature-font fix: the font fix corrects malformed Allura glyphs, while this change corrects how mail clients identify the PDF attachment.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `email-delivery`: PDF attachments must declare the `application/pdf` media type so recipient mail clients can identify and open them without relying on the filename extension.

## Impact

- `src/modules/completion-certificates/service.ts`
- `src/modules/individual-training-notices/service.ts`
- `src/modules/official-roster-pdfs/service.ts`
- `src/modules/notifications/client.ts` and its tests, if attachment media-type handling is centralized
- Unit or integration coverage for the outbound request body
- No database, migration, API, template, or PDF-content changes
- Needs an end-to-end check with an iPhone mail client after deployment

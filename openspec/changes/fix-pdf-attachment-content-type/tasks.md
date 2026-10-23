## 1. Attachment contract

- [x] 1.1 Make `contentType` a required field on `EmailAttachment` so every attachment declares its media type.
- [x] 1.2 Confirm the inline logo still declares `image/png` and no attachment path relies on an implicit default.
- [x] 1.3 Confirm `sendEmail` forwards `content_type` unchanged to the Resend request body.

## 2. PDF-producing email paths

- [x] 2.1 Add `contentType: "application/pdf"` to the completion certificate attachment.
- [x] 2.2 Add `contentType: "application/pdf"` to the individual training notice attachment.
- [x] 2.3 Add `contentType: "application/pdf"` to the official roster attachment.

## 3. Automated coverage

- [x] 3.1 Extend the notifications client test to assert a PDF attachment sends `content_type: application/pdf`.
- [x] 3.2 Add service-level assertions that certificate, training notice, and official roster messages attach their PDFs with `application/pdf`.
- [x] 3.3 Add a case proving the type comes from the attachment metadata rather than the filename extension.

## 4. Verification

- [x] 4.1 Run `npm run check` and `npm run test`.
- [x] 4.2 Run `openspec validate fix-pdf-attachment-content-type --strict`.
- [ ] 4.3 Deploy, resend one completion certificate, and confirm the attachment is recognized by an iPhone mail client.
- [ ] 4.4 Confirm the same attachment still opens on a desktop client.
- [ ] 4.5 If the iPhone still refuses the PDF, verify the generated PDF separately before treating the MIME change as complete.

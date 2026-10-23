## 1. Clean individual certificate output

- [x] 1.1 Change `renderCertificateForParticipant` to render and flatten the template page, copy it into a fresh `PDFDocument`, and save the new document.
- [x] 1.2 Keep the certificate metadata helper on the clean output.
- [x] 1.3 Leave the batch and fire-roster clean-output paths unchanged.

## 2. Regression coverage

- [x] 2.1 Add a test that asserts the individual certificate PDF has exactly one document catalog.
- [x] 2.2 Assert the individual certificate does not contain `/EmbeddedFiles` or a `Content Credentials`/`application/c2pa` attachment.
- [x] 2.3 Assert the clean PDF still contains the participant, course, signature, and expected fonts.
- [x] 2.4 Confirm the batch path still produces its cover plus one page per participant.

## 3. Verification

- [x] 3.1 Run `npm run check` and `npm run test`.
- [x] 3.2 Run `openspec validate fix-emailed-certificate-mobile-rendering --strict`.
- [ ] 3.3 Deploy, resend one certificate, and confirm it opens on an iPhone.
- [ ] 3.4 Confirm the same certificate still opens on a desktop client.
- [ ] 3.5 If the clean certificate still fails on iPhone, investigate the certificate fonts or embedded image separately before closing this change.

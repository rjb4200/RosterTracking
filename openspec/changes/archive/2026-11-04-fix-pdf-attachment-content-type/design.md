## Context

`sendEmail` forwards an attachment's `contentType` to Resend only when the caller sets it. The certificate, individual training notice, and official roster email paths pass `filename` and `bytes` but omit the type, so Resend labels the parts `application/octet-stream`. Desktop clients commonly fall back to the `.pdf` filename, but iOS Mail and Quick Look rely on the declared media type and can refuse to preview the attachment.

This is separate from the malformed Allura subset that made signatures blank or illegible. The font defect is fixed by embedding the signature face without subsetting; this change corrects the email envelope so the PDF is identifiable by type.

## Goals / Non-Goals

**Goals:**

- Every PDF email attachment is sent with `Content-Type: application/pdf`.
- A future attachment cannot silently omit its media type.
- The outbound Resend payload is covered by an automated test.
- The change is verified on an iPhone mail client after deployment.

**Non-Goals:**

- Changing PDF layout, fonts, signature rendering, or the certificate bytes.
- Changing delivery queuing, retries, auditing, or the shared email shell.
- Changing attachment filenames or adding new attachment types.
- Making already-sent messages change retroactively.

## Decisions

### Declare `application/pdf` at each PDF-producing call site

Set `contentType: "application/pdf"` in the certificate, individual training notice, and official roster attachment objects.

This keeps the type beside the code that knows the bytes are a PDF. Inferring the type inside `sendEmail` from the filename was rejected: it would hide a missing declaration, could mislabel a renamed file, and would not cover bytes with no extension.

### Require `contentType` on `EmailAttachment`

Make the field required so TypeScript rejects a new attachment that forgets its media type. The inline logo already supplies `image/png`, so every current call site can satisfy the type.

Alternatives considered:

- **Leave it optional and rely on tests**: weaker; the next attachment path can repeat the bug.
- **Infer defaults in `sendEmail`**: convenience, but it converts an explicit contract into a guess.
- **Central `pdfAttachment` helper**: useful if PDF attachment construction grows, but the required field plus three explicit call sites is simpler and keeps the byte-producing module in control.

### Test the provider payload, not just the helper

Extend the notifications client test to assert that a PDF attachment is forwarded with `content_type: application/pdf` in the Resend request body. Add service-level assertions where the PDF-producing paths are already tested so a future call site cannot drop the type without failing.

### Treat iOS as a manual acceptance check

Automated tests can prove the MIME type; they cannot prove a particular Mail or Quick Look version will preview it. After deployment, send a certificate to an iPhone, open it from Mail, and confirm the PDF is recognized.

## Risks / Trade-offs

- **MIME is necessary but not sufficient for every client** → Keep the filename and standard PDF bytes unchanged; verify on the actual iPhone client and investigate the PDF separately if a specific device still refuses it.
- **Existing messages remain mislabeled** → Resend the affected certificate after deployment; only newly sent messages carry the corrected type.
- **Requiring `contentType` creates a compile error for future attachment paths** → Intended; the error forces the author to state the media type.
- **A caller could declare the wrong type** → Keep declarations next to the byte-producing module and assert the expected value in tests.
- **No production email API call in tests** → The existing client test mocks fetch and inspects the request body, so it verifies the contract without sending mail.

## Migration Plan

1. Deploy the code-only change.
2. Resend a completion certificate and verify the attachment is recognized on an iPhone.
3. Verify the same on a desktop client to confirm no regression.
4. Roll back by reverting the code; no database or data migration is involved.

## Open Questions

None.

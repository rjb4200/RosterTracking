## Context

The attachment MIME type is now correct: the latest emailed certificate is sent as `application/pdf`. The same PDF still fails on iPhone.

The direct certificate path renders into the approved template and saves that modified document. The template carries a second catalog generation and a 24 KB embedded `Content Credentials` (`application/c2pa`) file. The saved individual certificate therefore retains both, while the fire roster and the admin certificate batch copy their pages into a fresh `PDFDocument` and do not. The working outputs have one catalog and no C2PA attachment.

The certificate is already flattened before it is saved, so copying its page into a clean document should preserve its rendered content, fonts, signature, and image without carrying the template’s catalog-level artifacts.

## Goals / Non-Goals

**Goals:**

- Emit emailed and resent individual certificates as clean standalone PDFs.
- Remove the template’s duplicate catalog and embedded C2PA file from the individual certificate output.
- Preserve every visible certificate value and the existing signature/font/image rendering.
- Add structural regression coverage for the cleaned output.
- Verify the emailed certificate on an iPhone after deployment.

**Non-Goals:**

- Changing certificate facts, signature selection, or the certificate template artwork.
- Changing the certificate email template, sender, attachment filename, or MIME type.
- Changing the admin batch cover or page order.
- Modifying the approved template file itself.
- Adding a PDF validation library or external service.

## Decisions

### Copy the rendered page into a fresh PDFDocument

Change the individual certificate renderer to:

1. Render and flatten the certificate page from the template.
2. Create a new `PDFDocument`.
3. Copy page 0 into the new document.
4. Apply the certificate metadata and save.

This is the same clean-output pattern already used by `renderCompletionCertificates` and `renderCompletionCertificateBatch`, and by the working fire roster.

Alternatives considered:

- **Delete `/Names` and the orphan catalog from the template copy**: targeted, but brittle. Any other template-level catalog object would remain, and it requires understanding the template’s incremental-update structure.
- **Edit the approved template**: changes a checksum-verified asset and affects every renderer.
- **Strip the C2PA stream only**: leaves the duplicate catalog generation and does not guarantee a clean document.
- **Accept the structure and rely on the MIME type**: already disproven by the latest `application/pdf` certificate failing on iPhone.

### Keep the batch and roster paths unchanged

They already copy pages into a clean output and are the working reference behavior. The individual email/resend path is the outlier.

### Prove the result structurally

A regression test should render an individual certificate and assert:

- exactly one document catalog,
- no `/EmbeddedFiles` or `application/c2pa` entry,
- the expected participant, course, signature, and template content remain.

The test does not need to emulate iOS; it verifies the structural property that distinguishes the failing output from the working outputs.

## Risks / Trade-offs

- **Copying a page drops page-level annotations or metadata** → The certificate is flattened before copying, so there are no interactive fields to preserve. Keep the existing metadata helper on the new document and assert visible content in tests.
- **Copying changes font/image resource references** → `copyPages` carries the page resources; the existing admin batch already proves this path renders the certificate content.
- **The clean PDF still fails on a particular iPhone** → The manual acceptance check remains. If it still fails, investigate the custom fonts or image separately; the clean structure removes the known template-level anomaly first.
- **Another output path reintroduces the template save** → Centralize individual certificate byte generation and cover it with the structural test.

## Migration Plan

1. Deploy the code-only change.
2. Resend one certificate and confirm it is recognized and opens on iPhone.
3. Confirm desktop rendering is unchanged.
4. Roll back by reverting the renderer; no database migration or data cleanup is involved.

## Open Questions

None.

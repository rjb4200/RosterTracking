## Why

The transactional email the department sends is generic and off-brand: it uses an invented dark red (`#7f1d1d`) rather than the department red (`#A40104`), carries no logo, and reads like a system notice. As the department's training output, the certificate email is often the participant's most visible impression of Winchester Fire Department, and it should look official and professional.

## What Changes

- Introduce a **shared branded email shell** — one header and footer used by every outbound email — so the certificate and roster emails (and future messages) carry the same Winchester Fire Department identity.
- Render the header as a **department-red plate** carrying the white WFD shield, the wordmark "Winchester Fire Department", and the tagline "Serving Winchester & Clark County, KY · Est. 1848", with a department-green accent rule.
- Deliver the logo as an **inline (CID) image** embedded in each message, so it renders without the app hosting a public asset and is never blocked as a remote image.
- Rewrite the **certificate email** in a formal register and include the **lead and assisting instructors** and the participant's **represented agency**.
- Adopt the shared shell for the **official-roster email**, which is currently a bare paragraph.
- Add the **optimized logo asset** to the email module.

## Capabilities

### New Capabilities
<!-- None: this polishes the existing email capability. -->

### Modified Capabilities
- `email-delivery`: every outbound email renders inside one shared branded header/footer, and the brand logo is delivered as an inline image.
- `completion-certificates`: the per-participant certificate email presents the course facts, the lead and assisting instructors, and the participant's agency in a formal message.

## Impact

- **Email foundation**: `src/modules/notifications` gains brand tokens, a shared layout (`emailHeader`/`emailFooter`), an inline-image attachment path, and an optimized logo asset.
- **Shared client**: `sendEmail` grows support for inline attachments (`contentId`), which Resend renders as `cid:` references.
- **Certificate email**: `templates.ts` is restructured into a shared shell plus the certificate body; the input gains instructor and agency fields.
- **Certificate delivery**: the notification input built in `completion-certificates/service.ts` now supplies instructor and agency facts already present in the snapshot.
- **Roster email**: `official-roster-pdfs/service.ts` sends through the shared shell and logo instead of a bare paragraph.
- **Data**: no schema change; all added facts already exist in the finalization snapshot.
- **Config**: no new external dependency; the CID approach avoids needing a public asset URL or `NEXTAUTH_URL` for images.

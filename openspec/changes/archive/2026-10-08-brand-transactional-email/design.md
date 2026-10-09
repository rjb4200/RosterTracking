## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `src/modules/notifications/templates.ts` is one monolithic certificate HTML string and uses an invented red (`#7f1d1d`).
- `src/modules/notifications/client.ts` `sendEmail` supports file attachments only (`filename`, `bytes`); it has no inline-image concept.
- `src/modules/official-roster-pdfs/service.ts` sends the roster email as a bare paragraph.
- Department brand values come from `winchesterfireems.com/css/style.css`: red `#A40104`, red hover `#8C1C1C`, accent green `#6A994E`, ink `#333`, page background `#f4f4f4`; type is Roboto Condensed (with EB Garamond for ceremonial text).
- The supplied logo is `WFD_logo_transparent.png` — 959×959, 32-bit ARGB, a white mark on transparency.
- The finalization snapshot already carries `instructors[]` (`name`, `isLead`) and `attendance[].agencyName`.

## Goals / Non-Goals

**Goals:**
- One shared, brand-accurate header/footer used by every outbound email.
- Deliver the logo inline (CID) so it renders without hosting and without remote-image blocking.
- A formal certificate email that includes lead and assisting instructors and the participant's agency.
- Bring the roster email onto the same shell.
- Ship an optimized logo asset.

**Non-Goals:**
- No public/hosted logo and no image dependency on `NEXTAUTH_URL`.
- No certificate thumbnail or any retained generated artifact.
- No webfont embedding; system-safe stacks only.
- No change to certificate or roster PDF generation, or to delivery/outbox behavior.

## Decisions

### D1 — The shared shell is code, not a copied string

Add `src/modules/notifications/layout.ts` exporting `BRAND` tokens and `emailHeader()` / `emailFooter()` HTML builders. Templates compose their body between them.

- **Why**: one source of truth for the brand; certificate, roster, and future messages inherit identity automatically and cannot drift.
- **Alternatives**: duplicating the header/footer inside each template (drifts); a template engine (no dependency justifies it).

### D2 — The logo is delivered as an inline CID image

Extend `EmailAttachment` with optional `contentId` and `contentType`; when present, `sendEmail` sends it as an inline part with a `content_id`. The header references the logo as `src="cid:wfd-logo"`. The certificate and roster sends each attach the logo.

- **Why**: no hosting, no public asset, no `NEXTAUTH_URL` dependency for images, and inline images are shown where remote images are often blocked.
- **Alternatives**: a hosted `public/` asset (needs env + serving); hot-linking the department site (couples to an external site and is still blocked).
- **Assumption**: Resend supports `content_id` on attachments; verify at implementation and fall back to a hosted asset if that ever changes.

### D3 — Brand tokens are taken from the department stylesheet

`BRAND = { red: "#A40104", redDark: "#8C1C1C", green: "#6A994E", ink: "#333333", muted: "#6b7280", page: "#f4f4f4" }`.

- **Why**: the email should match the department's own site, not an invented palette.
- **Alternatives**: keep the current dark red (off-brand).

### D4 — Header is a red plate with the white transparent logo

A solid `#A40104` table cell, the white transparent logo centered, the wordmark "Winchester Fire Department" in white, the tagline "Serving Winchester & Clark County, KY · Est. 1848" beneath, and a `#6A994E` accent rule under the plate. Footer is the department's contact block.

- **Why**: the user chose the red plate; the white transparent mark reads cleanly on red; the green rule echoes the department site.
- **Alternatives**: a white header (rejected — loses the plate character).

### D5 — The certificate email input carries instructors and agency

`CertificateEmailInput` gains `instructors: { name, isLead }[]` and `agencyName`. `completion-certificates/service.ts` builds them from the snapshot when rendering the message.

- **Why**: the required content already exists in the revision snapshot; only plumbing is added.
- **Alternatives**: re-query instructors/agencies live (breaks revision-immutability and is unnecessary).

### D6 — The roster email adopts the shared shell

`official-roster-pdfs/service.ts` builds its body with `emailHeader()` / `emailFooter()` and attaches the logo, instead of a bare paragraph.

- **Why**: consistent department identity across all outbound mail.
- **Alternatives**: leave the roster email plain (inconsistent).

### D7 — The logo asset is optimized before shipping

Downscale the 959×959 source to roughly 240×240 and quantize/compress it, storing the optimized PNG in the notifications module.

- **Why**: the source is 260 KB, which is heavy to attach to every message.
- **Alternatives**: ship the original (wasteful); reference the original size via `width` attributes (does not reduce bytes).

## Risks / Trade-offs

- **Outlook (Word engine)** ignores `border-radius` and `max-width` → the shell is a fixed-width (600px) table; the plate is a solid cell, no rounded cards that matter.
- **Inline image not displayed** → the header still shows the wordmark and tagline; the image carries `alt="Winchester Fire Department"` and explicit `width`/`height`.
- **Dark-mode inversion** → add a `color-scheme` meta, keep the red plate solid and the body on white, and avoid low-contrast text.
- **Gmail clipping (~102 KB HTML)** → keep markup lean; the inline image does not count toward the HTML byte budget.
- **Every message now carries the logo** → acceptable once optimized to tens of KB.
- **CID support could change** → the design isolates the logo behind the attachment path, so switching to hosted is a contained change.
- **White logo on a light background is invisible** → the logo is only ever placed on the red plate.

## Migration Plan

1. Add the optimized logo asset to `src/modules/notifications`.
2. Extend `sendEmail` to accept inline attachments (`contentId`).
3. Add `layout.ts` with brand tokens and `emailHeader()` / `emailFooter()`.
4. Refactor the certificate template onto the shell and expand its input.
5. Pass instructors and agency from the certificate delivery path.
6. Move the roster email onto the shell and attach the logo.
7. Update the template tests (branded shell, inline image reference, escaping, graceful fallback).
8. **Rollback**: revert the commit; there are no schema or data changes.

## Open Questions

- None that change the approach or task breakdown; final spacing and type sizes can be tuned visually after implementation.

## 1. Logo asset and shared client

- [x] 1.1 Move `WFD_logo_transparent.png` from the Desktop into `src/modules/notifications/assets`, downscaled/optimized to roughly 240×240 (white mark on transparency)
- [x] 1.2 Extend `EmailAttachment` with optional `contentId` and `contentType` and teach `sendEmail` to send an inline part when `contentId` is present
- [x] 1.3 Add a helper that loads the optimized logo bytes with the CID `wfd-logo` for inline attachment

## 2. Shared brand shell

- [x] 2.1 Add `src/modules/notifications/layout.ts` with `BRAND` tokens (`#A40104`, `#8C1C1C`, `#6A994E`, `#333333`, `#6b7280`, `#f4f4f4`)
- [x] 2.2 Implement `emailHeader()`: red plate, centered inline logo (`cid:wfd-logo`) with alt/width/height, white wordmark, tagline, green accent rule, Outlook-safe table markup
- [x] 2.3 Implement `emailFooter()`: department name, `44 N Maple Street, Winchester, KY 40392`, `(859) 744-1598`, website
- [x] 2.4 Add the `color-scheme` meta and dark-safe styling to the shell

## 3. Certificate email

- [x] 3.1 Expand `CertificateEmailInput` with `instructors: { name, isLead }[]` and `agencyName`
- [x] 3.2 Rewrite the certificate body: formal completion statement, details card (course, date, hours, lead and assisting instructors, agency), attachment note, composed inside the shared shell
- [x] 3.3 Update the plaintext body to match the formal tone and new facts
- [x] 3.4 Supply instructors and agency from the snapshot in `completion-certificates/service.ts` and attach the logo inline

## 4. Roster email

- [x] 4.1 Move `official-roster-pdfs/service.ts` `sendWithResend` onto the shared shell and attach the logo inline, preserving its behavior and audit facts

## 5. Tests and verification

- [x] 5.1 Update `templates.test.ts`: assert the shared shell, the `cid:wfd-logo` reference, the brand red, escaping, and the graceful no-image wording
- [x] 5.2 Add a test that an inline `contentId` attachment is sent as an inline part
- [x] 5.3 Add a test that the certificate email includes the lead and assisting instructors and the agency
- [x] 5.4 Run `npm run check`, `npm run test`, `npm run build`, and the touched integration tests
- [x] 5.5 Update README/docs to describe the branded email shell and inline logo

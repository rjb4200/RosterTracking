## Why

Generated completion certificates paint a light-blue box behind every filled value because the approved template's text fields carry a `/MK /BG` background. The boxes obscure the certificate design and are not intended certificate content. The text should sit directly on the certificate background instead. The values are also left-aligned inside their boxes, which leaves the participant name off-center under the "Awarded To" label and the inline hours, course, and course-number values hugging the left edge of their blanks. The rendered type is plain Helvetica, which reads as generic for a formal certificate, and the typed signer name does not look like a signature.

## What Changes

- Clear each completion-certificate text field's `/MK /BG` entry before `updateFieldAppearances` regenerates appearances and flattens the form.
- Center the participant name, class hours, class name, and course number within their existing fields.
- Render the certificate's non-signature fields in the bundled Libre Baskerville serif and the instructor signature in the bundled Allura script.
- Embed both fonts (subset) in the generated PDF so it renders consistently without reader-installed fonts, and add the `@pdf-lib/fontkit` dependency that custom embedding requires.
- Scope all of these behaviors to the completion-certificate template only. Other generated PDFs (official rosters and individual training notices) keep their template field backgrounds, alignment, and Helvetica type unchanged.
- Leave the approved certificate template asset and its recorded checksum untouched; the approved source PDF remains byte-identical.
- Add regression tests proving a rendered certificate page has no field background, the intended fields are centered, the intended fonts are applied, and field values are unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `completion-certificates`: Certificate rendering must produce text directly on the certificate page background with no filled field background, center the participant and inline course values, and render the certificate body in Libre Baskerville with the instructor signature in Allura.

## Impact

- `package.json` — add `@pdf-lib/fontkit` so custom fonts can be embedded.
- `src/modules/official-roster-pdfs/fonts/` — new bundled Libre Baskerville and Allura TTF files with their OFL licenses.
- `src/modules/official-roster-pdfs/mappings.ts` — mark the completion-certificate mapping as field-background-free, list the fields to center, and assign the body and signature fonts.
- `src/modules/official-roster-pdfs/service.ts` — register fontkit, embed the mapped fonts, clear field backgrounds, apply center alignment, update per-field appearances, and flatten without regenerating appearances.
- `next.config.ts` — include the font assets in output file tracing for the certificate routes.
- `src/modules/completion-certificates/service.test.ts` — cover the transparent-field, centered-field, and font behavior.
- No database model, API contract, or delivery changes. The certificate value fingerprint is unchanged, so previously delivered participants are not re-emailed for a font change.

## 1. Template mapping

- [ ] 1.1 Add an optional `clearFieldBackgrounds` flag to the `TemplateMapping` type in `src/modules/official-roster-pdfs/mappings.ts`.
- [ ] 1.2 Add an optional `centerFields` list to `TemplateMapping` for the completion-certificate fields that should be centered.
- [ ] 1.3 Set `clearFieldBackgrounds: true` and list `Student_Name`, `Class_Hours`, `Course_Type`, and `Course_Number` in `centerFields` on `COMPLETION_CERTIFICATE_TEMPLATE` only; leave every other mapping unchanged.
- [ ] 1.4 Add `@pdf-lib/fontkit` as a runtime dependency.
- [ ] 1.5 Add the bundled `LibreBaskerville-Regular.ttf` and `Allura-Regular.ttf` assets and their `OFL.txt` licenses under `src/modules/official-roster-pdfs/fonts/`.
- [ ] 1.6 Extend `TemplateMapping` with font assignments and set the completion-certificate body font to Libre Baskerville and the `Instructor_Signature` field to Allura.

## 2. Renderer

- [ ] 2.1 In `renderPage` (`src/modules/official-roster-pdfs/service.ts`), when `mapping.clearFieldBackgrounds` is set, delete the `/MK /BG` entry from each field widget's appearance characteristics before `updateFieldAppearances`.
- [ ] 2.2 In `renderPage`, apply `setAlignment(TextAlignment.Center)` to each field named in `mapping.centerFields` before `updateFieldAppearances`.
- [ ] 2.3 Confirm both adjustments happen before `form.updateFieldAppearances(...)` and `form.flatten()` so regenerated appearances and the flattened page retain the transparent, centered result.
- [ ] 2.4 For the completion-certificate mapping only, register fontkit, load the font bytes, and embed Libre Baskerville and Allura with `{ subset: true }`.
- [ ] 2.5 Measure and write non-signature fields with Libre Baskerville (`setFittedText` receives the font per field) and write `Instructor_Signature` with Allura.
- [ ] 2.6 Update field appearances per field so the signature uses Allura, then flatten with `updateFieldAppearances: false` so the per-field fonts survive.
- [ ] 2.7 Keep the standard Helvetica path for every other mapping.

## 3. Tests

- [ ] 3.1 Add a test to `src/modules/completion-certificates/service.test.ts` asserting every certificate text field has no `/MK /BG` after an unflattened certificate page is rendered.
- [ ] 3.2 Assert the mapped field values are still present alongside the cleared backgrounds.
- [ ] 3.3 Assert `Student_Name`, `Class_Hours`, `Course_Type`, and `Course_Number` report center alignment (`/Q 1`) after rendering.
- [ ] 3.4 Assert `Completion_Date`, `Instructor_Name`, `Instructor_Title_Course`, and `Instructor_Signature` keep their original alignment.
- [ ] 3.5 Add a scope test proving an official-roster template still retains its supplied field background and alignment.
- [ ] 3.6 Verify the existing template-checksum test still passes, confirming the approved asset was not modified.
- [ ] 3.7 Assert the signature field's appearance stream references the Allura font and the body fields reference Libre Baskerville.
- [ ] 3.8 Assert both fonts are embedded subset objects in the generated PDF and that the output has no unresolved/missing-glyph text.
- [ ] 3.9 Assert the class name/title line's en dash renders (Libre Baskerville glyph coverage) and that other mappings still use Helvetica.

## 4. Verification

- [ ] 4.1 Run the completion-certificate and official-roster test files.
- [ ] 4.2 Run lint and typecheck.
- [ ] 4.3 Generate a certificate through the existing render path and confirm the output has no blue boxes and that the four requested values are centered.
- [ ] 4.4 Confirm the generated certificate shows Libre Baskerville body text and an Allura signature with correct glyphs.
- [ ] 4.5 Confirm the font assets are traced into the certificate deployment output (or extend `outputFileTracingIncludes`).

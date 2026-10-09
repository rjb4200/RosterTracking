## Why

The completion certificate prints the **course type in the blank reserved for the class name**, so the sentence reads "2 hours Continuing Education Course …" instead of "2 Continuing Education hours <class name> Course …". The template's fields also use fixed font sizes, so a long value can overflow its box instead of shrinking to fit.

## What Changes

- Re-map the certificate sentence `[blank 1] hours [blank 2] Course [blank 3]`:
  - **blank 1** prints the class hours **and** the course type (e.g. "2 Continuing Education"),
  - **blank 2** prints the **class name** (e.g. "Airway Management"),
  - **blank 3** prints the course number when present.
- Make the **signature-block line** (`Instructor_Title_Course`) print `<course type> – <class name>`, **shrinking the text to fit its box**, and **dropping the course type** when a very long class name cannot fit.
- **Shrink each text value to fit its field** (compute a font size from the measured text width against the field width) so nothing overflows.

## Capabilities

### New Capabilities
<!-- None: this corrects the existing certificate output. -->

### Modified Capabilities
- `completion-certificates`: the certificate's printed sentence maps the hours, course type, class name, and course number to the correct blanks, and text is sized to fit its field.

## Impact

- **Renderer**: `completion-certificates/service.ts` (`fillCertificate`, the class-hours/type helpers, and the instructor title/course line).
- **Template mappings**: `official-roster-pdfs/mappings.ts` typography/fit values for the certificate fields.
- **Tests**: certificate unit tests for the field values and the long-name fallback.
- **Data**: none — every value already exists in the finalization snapshot.

## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `completion-certificates/service.ts` `fillCertificate()` maps `Class_Hours` ← hours, `Course_Type` ← course-type label, `Course_Number` ← number, and `Instructor_Title_Course` ← `<type> – <class name>`.
- The certificate template's fields use **fixed default-approearance font sizes** (Student_Name 22, Course_* 9, Completion_Date 11, Instructor_Signature 11, Instructor_Name 10, Instructor_Title_Course 9), and `renderPage` sets text then calls `updateFieldAppearances` with an embedded Helvetica — nothing shrinks, so a long value overflows.
- Field widths: Class_Hours ≈112pt, Course_Type ≈72pt, Course_Number ≈78pt, Instructor_Title_Course ≈200pt. The middle (class-name) blank is the narrow one.
- The sentence's static words are `[blank 1] hours [blank 2] Course [blank 3]`.

## Goals / Non-Goals

**Goals:**
- Put the class hours together with the course type in blank 1, the class name in blank 2, and the course number in blank 3.
- Size each certificate value to fit its field.
- Keep the signature line `<course type> – <class name>`, dropping the type for a class name that cannot fit.

**Non-Goals:**
- No change to the approved template asset, its field boxes, or field names.
- No new data; all values already exist in the snapshot.
- No re-layout of the certificate or the other roster forms.

## Decisions

### D1 — Re-map the three sentence fields in `fillCertificate()`

`Class_Hours` renders `<hours> <type label>`; `Course_Type` renders the class name; `Course_Number` renders the number when present.

- **Why**: matches the blank's static words, so the sentence reads "2 Continuing Education hours Airway Management Course CE-1".
- **Alternatives**: keep the type in the middle blank (the reported bug); add a new field (the blank has none).

### D2 — Shrink text by computing a font size per field

Measure each value with the embedded Helvetica (`widthOfTextAtSize`), reduce the field's font size from its default down to a floor (default 6pt) until the value fits the field width, and set it with `field.setFontSize()` before `updateFieldAppearances`.

- **Why**: the field sizes are fixed, so fit must be explicit; measuring is deterministic and testable.
- **Alternatives**: set the default-appearance size to 0 and rely on auto-size (pdf-lib support is unreliable and viewer-dependent).

### D3 — Compose the signature line, dropping the type only when needed

`Instructor_Title_Course` renders `<type> – <class name>`; if that does not fit at the floor, render the class name alone.

- **Why**: the user wants the type shown when it fits and dropped for very long class names.
- **Alternatives**: always the class name (loses the type); always both (overflows).

### D4 — The class name stays in the narrow middle blank

The class name is printed in the ≈72pt middle blank and shrunk to fit, accepting small text for long names.

- **Why**: that blank is where the static word "Course" follows, so it is the only correct position; the blanks are fixed and cannot reflow.
- **Alternatives**: move the class name to a wider blank (violates the sentence); abbreviate the name (lossy).

## Risks / Trade-offs

- **The middle blank is only ≈72pt** → long class names render small; mitigated by the floor and by dropping the type from the signature line where it does not matter.
- **`setFontSize` + `updateFieldAppearances` interplay** → set the size before rendering and assert the rendered value in a test.
- **Determinism** → the shrink computation is pure and deterministic, so golden tests stay stable.
- **Field alignment** → shrinking a right-aligned field shifts the text; verify the certificate's field alignment and keep it consistent.

## Migration Plan

1. Add a small fit helper (measure + shrink to the field width) in the certificate renderer.
2. Re-map the three sentence fields and the signature line using the helper.
3. Update the certificate unit tests for the new values and the long-name fallback.
4. **Rollback**: revert the commit; the change is code-only with no data or schema impact.

## Open Questions

- The exact minimum font size (floor) and the length threshold at which the signature line drops the type; both can be tuned visually after implementation without changing the approach.

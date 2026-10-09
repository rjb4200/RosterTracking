## 1. Fit helper

- [x] 1.1 Add a helper that measures a value with the embedded Helvetica and returns the largest font size (down to a floor) that fits a field's width

## 2. Sentence mapping

- [x] 2.1 Render the first blank as the class hours together with the course type label (for example "2 Continuing Education")
- [x] 2.2 Render the second blank as the class name
- [x] 2.3 Keep the third blank as the course number, blank when the class has none
- [x] 2.4 Apply the fit helper to each sentence field so the value never overflows

## 3. Signature line

- [x] 3.1 Compose the signature line as `<course type> – <class name>` and shrink it to fit
- [x] 3.2 Drop the course type and render only the class name when the composed line cannot fit at the floor

## 4. Tests and verification

- [x] 4.1 Unit-test the sentence field values: hours and type together, class name in the middle blank, number present and absent
- [x] 4.2 Unit-test the signature line composition and the long-name type-drop
- [x] 4.3 Unit-test that a value too wide for its field is shrunk to fit
- [x] 4.4 Run `npm run check`, `npm run test`, and `npm run build`

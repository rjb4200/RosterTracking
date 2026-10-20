## 1. Duration options

- [x] 1.1 Build a shared option list for every 15-minute duration from `30m` through `16h`, labelled with `formatHours`.
- [x] 1.2 Represent each option's value as decimal hours so the existing `creditedHours` contract is unchanged.
- [x] 1.3 When the current value falls outside the offered range, add a synthetic option for that exact value and mark it as the current duration.
- [x] 1.4 Default an empty or invalid current value to `2h`.

## 2. Shared duration control

- [x] 2.1 Replace the hours and minutes selects in `DurationFields` with one duration select.
- [x] 2.2 Keep the select's accessible name from `fieldLabel` and keep the hidden decimal input out of the accessibility tree.
- [x] 2.3 Give the select a compact content-sized width and remove the now-unused `.duration-fields` flex rules while keeping `.field-label` for checkbox groups.

## 3. Integration

- [x] 3.1 Confirm class creation renders the single picker, defaults to two hours, and submits decimal hours.
- [x] 3.2 Confirm the session editor in the post-class workspace uses the same picker and recalculates the end time.
- [x] 3.3 Confirm an edited session with an out-of-range duration shows and preserves its current value.

## 4. Tests

- [x] 4.1 Add unit coverage for the option range, labels, defaults, and synthetic fallback.
- [x] 4.2 Update browser selectors that target the old hours and minutes controls to the single duration select.
- [x] 4.3 Add browser coverage for choosing `2h 30m` in class creation and for preserving an out-of-range session duration.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Run the class-creation, session-editing, and review browser suites.
- [x] 5.3 Run `openspec validate simplify-duration-picker --strict`.

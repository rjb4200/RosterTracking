## 1. Per-login marker

- [x] 1.1 Expose the account's last sign-in timestamp on `CurrentStaff` and `getCurrentStaff` as the marker that identifies the current login.

## 2. Prompt band

- [x] 2.1 Render the prompt as a full-bleed band in the protected staff layout directly beneath the header and above the section navigation, still gated on the account having no email.
- [x] 2.2 Replace the current `.staff-email-prompt` styles with a `.staff-email-band`: full-bleed, `--signal`/`--signal-dark` palette, white centered copy, alert emphasis, responsive stacking, and the section-header horizontal padding.
- [x] 2.3 Add the primary "Add email" call to action linking to `/staff/profile` and a dismiss control, with `role="status"`, an accessible dismiss label, and keyboard support.

## 3. Dismissal semantics

- [x] 3.1 Read the dismissal cookie in the layout and skip rendering the band when it matches the current login marker, so there is no hydration flicker.
- [x] 3.2 Make the dismiss control record the current login marker and hide the band for the remainder of the sign-in.
- [x] 3.3 Confirm a subsequent sign-in changes the marker so the band returns while the account still has no email, and that storing an email hides it permanently.

## 4. Tests

- [x] 4.1 Test that the band is shown when the account has no email and absent when an email is stored.
- [x] 4.2 Test that a dismissal recorded for the current marker hides the band, and that a different marker shows it again.
- [x] 4.3 Test the band's accessible presentation: status role, dismiss label, and the add-email call to action.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Confirm `openspec validate improve-staff-email-prompt` passes.

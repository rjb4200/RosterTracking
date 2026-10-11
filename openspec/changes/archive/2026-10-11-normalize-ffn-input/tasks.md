## 1. Shared FFN normalizer

- [x] 1.1 Add a pure `normalizeFfn(raw)` to `src/modules/reference/credential-format.ts` that trims, forgives whitespace, hyphen, en dash, em dash, minus sign, and period as separators, rejects any other character, requires exactly 8 digits, preserves leading zeros (string digits, never `Number()`), and returns the canonical `dddd-dddd` form or a rejection result
- [x] 1.2 Have `validateCredentialValue` normalize the FFN type before applying the pattern, and use a clearer failure message ("Enter the FFN as 8 digits, like 0000-0000.")
- [x] 1.3 Leave `isValidFfn` strict (canonical-only) so Fire inclusion and eligibility are unchanged

## 2. Server integration

- [x] 2.1 Confirm the student-credential paths (sign-in staging, students-page credential upsert, correction service) all route through `validateCredentialValue`, so normalization happens before the uniqueness hash
- [x] 2.2 Change `parseProfileInput` in `src/modules/staff-auth/profile-contract.ts` to use the shared normalizer instead of its own `FFN_PATTERN.test`

## 3. Client tidy on blur

- [x] 3.1 Add a small client input for the sign-in credential field that reformats on blur via the shared helper (the sign-in form is a server component)
- [x] 3.2 Add on-blur reformatting to the students-page credential form, the class correction control, and the instructor/account profile forms
- [x] 3.3 Reformat only when the value cleanly normalizes; leave any other value untouched so the server rejection message is shown

## 4. Tests

- [x] 4.1 Unit-test the normalizer: 8 digits, forgiven separators, preserved leading zeros, a letter rejected, a wrong digit count rejected, and an already-canonical value passed through
- [x] 4.2 Unit-test that `validateCredentialValue` accepts and canonicalizes `12345678` and that equivalent inputs yield the same canonical value used for uniqueness
- [x] 4.3 Unit-test `parseProfileInput` normalization for the instructor FFN
- [x] 4.4 Confirm the existing strict-`isValidFfn` and inclusion tests still pass unchanged

## 5. Verification

- [x] 5.1 Run lint and typecheck

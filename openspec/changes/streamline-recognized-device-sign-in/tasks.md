## 1. Device recognition

- [x] 1.1 Issue the remembered-device cookie with site-root scope
- [x] 1.2 Confirm recognition fires from the public short-code entry and raw token links
- [x] 1.3 Remove the remembered cookie when recognition fails, as today

## 2. Remember by default

- [x] 2.1 Remove the remember-me checkbox from the sign-in page
- [x] 2.2 Issue or refresh a remembered-device token on every successful regular sign-in
- [x] 2.3 Keep `Not me` revoking the token and clearing recognition

## 3. One-screen recognized flow

- [x] 3.1 Extend the page model with a recognized-student step carrying name, masked credentials, and agency
- [x] 3.2 Render the recognized screen with a single `Confirm & Sign In` action
- [x] 3.3 Combine profile confirmation and attestation in the confirmation action
- [x] 3.4 Show `Update my information` to collect missing fields or credentials on the same screen
- [x] 3.5 Ensure a recognized student who already signed in still receives the existing-result response

## 4. Membership persistence

- [x] 4.1 Stage an added membership when the represented agency is outside the student's memberships
- [x] 4.2 Persist the membership only inside the successful attendance transaction and audit it
- [x] 4.3 Verify abandoned sessions create no membership

## 5. Verification

- [x] 5.1 E2E: scan the public short code on a remembered device and confirm in one action
- [x] 5.2 E2E: `Not me` revokes and returns to phone entry
- [x] 5.3 E2E: `Update my information` collects a missing credential before confirmation
- [x] 5.4 Integration test: membership added only on successful confirmation

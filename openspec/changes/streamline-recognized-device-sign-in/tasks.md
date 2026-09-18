## 1. Device recognition

- [ ] 1.1 Issue the remembered-device cookie with site-root scope
- [ ] 1.2 Confirm recognition fires from the public short-code entry and raw token links
- [ ] 1.3 Remove the remembered cookie when recognition fails, as today

## 2. Remember by default

- [ ] 2.1 Remove the remember-me checkbox from the sign-in page
- [ ] 2.2 Issue or refresh a remembered-device token on every successful regular sign-in
- [ ] 2.3 Keep `Not me` revoking the token and clearing recognition

## 3. One-screen recognized flow

- [ ] 3.1 Extend the page model with a recognized-student step carrying name, masked credentials, and agency
- [ ] 3.2 Render the recognized screen with a single `Confirm & Sign In` action
- [ ] 3.3 Combine profile confirmation and attestation in the confirmation action
- [ ] 3.4 Show `Update my information` to collect missing fields or credentials on the same screen
- [ ] 3.5 Ensure a recognized student who already signed in still receives the existing-result response

## 4. Membership persistence

- [ ] 4.1 Stage an added membership when the represented agency is outside the student's memberships
- [ ] 4.2 Persist the membership only inside the successful attendance transaction and audit it
- [ ] 4.3 Verify abandoned sessions create no membership

## 5. Verification

- [ ] 5.1 E2E: scan the public short code on a remembered device and confirm in one action
- [ ] 5.2 E2E: `Not me` revokes and returns to phone entry
- [ ] 5.3 E2E: `Update my information` collects a missing credential before confirmation
- [ ] 5.4 Integration test: membership added only on successful confirmation

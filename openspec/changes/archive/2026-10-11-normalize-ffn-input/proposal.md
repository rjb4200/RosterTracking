## Why

Firefighters enter their FFN (Fire Commission number) in loose forms — `12345678`, `1234 5678`, `1234.5678` — and the system rejects anything that is not already `0000-0000`. Forcing the user to hand-format an unambiguous 8-digit number is needless friction at sign-in and in every staff credential surface, and it drives mistakes that end up as malformed stored values.

## What Changes

- Add a shared FFN normalizer that accepts 8 digits with forgiven separators and canonicalizes them to `0000-0000` (for example `12345678` → `1234-5678`).
  - Forgiven separators are whitespace, hyphen, en dash, em dash, minus sign, and period. Any other character (letters, `+`, `#`, …) still fails: `abc1234-5678` is rejected, not silently stripped.
  - Exactly 8 digits are required; 7 or 9 digits are rejected rather than guessed. Leading zeros are preserved (`0123-4567` stays `0123-4567`).
- Apply normalization on the server **before validation and storage**, so the canonical value is what is hashed for uniqueness, encrypted, and masked. A client-only reformat cannot guarantee this.
- Apply the same normalization to **instructor FFN** capture, not only student credentials.
- Tidy the value on the client **on blur/submit** as a visible aid; the server normalization remains authoritative.

**Non-goals:**

- No repair of already-stored malformed values.
- No display-time reformat: official roster PDFs print the stored value as-is.
- The strict `isValidFfn` gate used by Fire inclusion is unchanged; normalization happens on input, so reporting semantics do not move.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `credentials`: an FFN value is normalized before it is validated and stored, and normalization happens before the uniqueness hash, so equivalent inputs collapse to one canonical value.
- `instructor-profiles`: instructor FFN capture uses the same normalization, so `12345678` is accepted and stored as `1234-5678`.

## Impact

- **Reference/credentials**: `src/modules/reference/credential-format.ts` (shared normalizer + `validateCredentialValue`), `src/modules/reference/services.ts` and `src/modules/credential-correction/service.ts` (already route through `validateCredentialValue`).
- **Staff profiles**: `src/modules/staff-auth/profile-contract.ts` (`parseProfileInput`).
- **Input surfaces**: `src/app/sign-in/page.tsx` (needs a small client input for blur-tidy), `src/app/staff/(protected)/students/credential-form.tsx`, `src/app/staff/(protected)/classes/credential-correction-control.tsx`, `src/app/staff/(protected)/profile/profile-form.tsx` and account forms.
- No schema migration and no change to stored data or the uniqueness index definition.
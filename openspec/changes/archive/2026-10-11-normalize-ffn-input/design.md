## Context

See proposal.md — Why. Relevant current state:

- `credential-format.ts` is the single server choke point for student credential values (`validateCredentialValue`), and it has **no `server-only` import**, so it is already safe to import from client components. Whatever it returns becomes `valueHash`, `encryptedValue`, and `maskedSuffix`, and the `(credential_type_id, value_hash)` unique index is derived from it.
- Instructor FFN bypasses that choke point: `parseProfileInput` (`staff-auth/profile-contract.ts`) does its own `FFN_PATTERN.test`.
- `isValidFfn` is the strict canonical gate used by Fire inclusion (`inclusion.ts`, `fire-eligibility.ts`) and must not start accepting loose input.
- The public sign-in form is a server component; the staff credential, correction, and profile forms are already client components.

## Goals / Non-Goals

**Goals:**
- One canonicalization rule applied identically to student credentials and instructor FFN.
- Guarantee canonical form before the uniqueness hash, regardless of client behavior.
- A visible client-side tidy without making the client authoritative.

**Non-Goals:**
- Repairing already-stored values (no write-back, no read-time reinterpretation).
- Reformatting values at display or PDF print time.
- Loosening `isValidFfn` / reporting inclusion semantics.
- A data-driven normalizer registry for other credential types.

## Decisions

**1. One pure helper in `credential-format.ts`.** Add a pure `normalizeFfn(raw)` that returns the canonical value or a rejection signal, and have `validateCredentialValue` call it for the FFN type before applying the pattern. Alternative: a separate client implementation — rejected, the two would drift and the client is not the guarantee.

**2. Normalize inside the server validation choke point, before hashing.** Because every derived value comes from the validated return, canonicalizing there makes `12345678` and `1234-5678` hash identically and keeps the unique index meaningful. Alternative: format in the UI only — rejected, it cannot guarantee the hash.

**3. Forgive separators, reject other characters, require exactly 8 digits.** Allowed separators are whitespace, hyphen, en dash, em dash, minus sign, and period; any other character fails; 7 or 9 digits fail; leading zeros are preserved by working on the digit string, never `Number()`. Alternative: strip all non-digits — rejected, it silently accepts `abc12345678`. Alternative: guess a dropped leading zero for 7 digits — rejected, it can assign the wrong FFN.

**4. Route instructor FFN through the same helper.** `parseProfileInput` calls the shared normalizer instead of its own regex so students and instructors behave alike. Alternative: student-only — rejected per the decision that instructors get the same treatment.

**5. Keep `isValidFfn` strict.** It stays a canonical-only predicate so inclusion and Fire eligibility are unchanged; normalization is an input concern, not a stored-value concern.

**6. Client tidy on blur via the same pure helper.** Client components (`credential-form`, `credential-correction-control`, `profile-form`) reformat the field on blur. The sign-in form is a server component, so a small client input is introduced there for the same blur behavior. The server normalization remains authoritative; the client is a convenience and shows the user what will be stored.

**7. Split input normalization from stored-value validity.** Reporting inclusion and the correction surface's invalid flag read *stored* values, and they previously gated on `validateCredentialValue`. Since that is now the normalizing input path, a strict `isValidCredentialValue` (no normalization) is introduced and used by those readers, so a loose stored value is never reinterpreted as valid. This preserves `inclusion.test.ts` and Fire eligibility semantics.

## Risks / Trade-offs

- **Legacy stored values hash differently**, so an equivalent new input is not detected as a duplicate → Mitigation: explicit non-goal; the correction surface already flags a non-conforming stored value, and the operator can replace it (which then canonicalizes).
- **Forgiving separators accept odd-but-unambiguous groupings** (for example `1.234.5678`) → Mitigation: the exact-8-digit rule means the digit sequence is always unambiguous; odd grouping cannot change the number.
- **Blur-tidy on the correction control rewrites a legacy value without the operator typing** → Mitigation: tidy is a display aid and submission is authoritative; the operator sees the canonical value and must still supply a reason before it is saved.
- **Free-text pastes** (spreadsheet cells with stray characters) → Mitigation: non-separator characters are rejected with a clear message rather than silently altered.

## Migration Plan

No schema migration and no data change. Deploy is additive. Rollback is reverting the normalizer, which restores the previous reject-loose-input behavior; no data needs undoing because stored values are already canonical for anything written through the old path.

## Open Questions

- Whether any non-FFN credential type will ever need its own normalization (which would argue for a normalizer keyed by type code rather than an FFN-specific function). Deferrable; today only the FFN has a defined value format.

## 1. Schema and migration

- [ ] 1.1 Define student PIN and remembered-device schema with hashed secrets, expiration, revocation, lookup indexes, and restrictive student references.
- [ ] 1.2 Define public rate-limit window schema keyed by one-way identifier and request-source fingerprints with bounded expiration indexes.
- [ ] 1.3 Add a class sign-in token-version column and define encrypted expiring workflow staging, attendance, class-scoped guest, attestation, reporting-context, and protected student-field/credential-snapshot schema with regular-versus-guest checks and retained request metadata.
- [ ] 1.4 Add a partial unique active class/student constraint, payload-bound class/idempotency constraints, agency and class references, attendance removal state, and indexes needed by later roster queries.
- [ ] 1.5 Generate, review, and apply the additive Phase 5 migration without modifying existing class or reference records.

## 2. Public access security

- [ ] 2.1 Add a signed, HTTP-only, short-lived class workflow context with token version, workflow nonce, and server-issued idempotency key plus encrypted expiring server-side staging; use production `Secure`, `SameSite=Lax`, sign-in path scoping, same-origin checks, nonce validation, bounded cleanup, and open-class/token-version revalidation on every public action.
- [ ] 2.2 Update class sign-in rotation to atomically replace the token hash and increment its version so every previously issued workflow context is invalidated immediately.
- [ ] 2.3 Add staff-controlled Argon2id student PIN setup/reset and existing-PIN verification/replacement services with authorization checks and secret-free audit events, without returning or logging plaintext PINs.
- [ ] 2.4 Add remembered-device generation, hash lookup, refresh, expiration, revocation, `Not me` handling, and secure cookie behavior for regular students only.
- [ ] 2.5 Add database-backed volume limits for every phone lookup and guest confirmation plus failure limits for PIN and regular confirmation attempts using class/source and HMAC identifier fingerprints with trusted platform request metadata.

## 3. Student identification and requirements

- [ ] 3.1 Implement active-student recognition in remembered-device, normalized-phone, and Student ID plus PIN priority order with enumeration-safe responses.
- [ ] 3.2 Implement phone-change recovery that requires valid Student ID plus PIN, encrypts the new unique phone in server-side workflow staging, and applies it only inside successful attendance confirmation.
- [ ] 3.3 Resolve the effective reporting requirement-set version for every class reporting system and compute the union of required fields and credentials.
- [ ] 3.4 Add a narrowly scoped class-context-bound public update path that encrypts regular-student profile and credential changes in server-side workflow staging, applies them only inside confirmation, and writes same-transaction audit events.
- [ ] 3.5 Add eligible attendance-agency resolution from active student memberships and preserve the student's explicit class selection.

## 4. Attendance transaction

- [ ] 4.1 Implement class-scoped guest validation for participant name, any active catalog agency, required roster fields, and encrypted credential values without creating a student.
- [ ] 4.2 Implement one locked attendance confirmation transaction that consumes server-side workflow staging and revalidates class state, token version, participant, agency, requirements, server-issued idempotency key, and payload fingerprint before writing any attendance facts or student updates.
- [ ] 4.3 Persist the rendered attestation text and version, server timestamp, sign-in method, originating IP, remembered-device reference, requirement-set versions, and protected required-field/credential snapshots.
- [ ] 4.4 Return existing active attendance for regular duplicates and exact idempotent retries, reject changed payload reuse, and allow a new active record only after a retained prior attendance is removed.
- [ ] 4.5 Issue or refresh remembered-device access only after successful regular attendance and record sanitized attendance security events without secret material.

## 5. Mobile sign-in workflow

- [ ] 5.1 Replace the open-token placeholder with a mobile-first class sign-in shell and retain the generic unavailable page for invalid or inactive class contexts.
- [ ] 5.2 Add remembered-student confirmation, bounded exact-phone lookup, Student ID plus PIN recovery, existing-PIN replacement, phone replacement, and `Not me` screens with non-enumerating validation feedback where applicable.
- [ ] 5.3 Add reporting-field and credential completion plus active agency selection for regular students.
- [ ] 5.4 Add the visually secondary guest form with class-required fields, credentials, agency selection, and no remembered-device option.
- [ ] 5.5 Add the named attestation review, `Confirm & Sign In` action, duplicate-safe success state, expired-context restart, and accessible pending/error behavior.
- [ ] 5.6 Add authorized staff PIN bootstrap/reset controls to student administration with secret-free audit events and without exposing prior or submitted PIN values after the action.

## 6. Tests and verification

- [ ] 6.1 Add unit tests for PIN hashing, remembered tokens, phone normalization, context signing, rate-limit fingerprints, requirement resolution, attestation rendering, and idempotency decisions.
- [ ] 6.2 Add integration tests for the migration, token-version invalidation, workflow cookie/nonce/origin protections, regular and guest constraints, staged phone recovery, PIN bootstrap/reset authorization, existing-PIN replacement, rejection of phone/device-only PIN changes, class-state locking, required-field/credential snapshots, public-update audits, removed-and-restored attendance, payload-bound retries, successful guest volume limits, and secret-free audit data.
- [ ] 6.3 Add mobile Playwright coverage for remembered-device, phone, Student ID plus PIN recovery, missing requirements, multiple agencies, guest fallback, `Not me`, duplicate submission, rate limiting, and inactive class access.
- [ ] 6.4 Update architecture documentation for application-level credential and attendance-snapshot encryption, key durability, public mutation boundaries, and attendance removal semantics.
- [ ] 6.5 Run lint, typecheck, unit/integration/E2E tests, migration checks, production build, and strict OpenSpec validation; resolve all failures.

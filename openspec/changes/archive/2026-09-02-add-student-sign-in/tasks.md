## 1. Schema and migration

- [x] 1.1 Define remembered-device schema with hashed tokens, expiration, revocation, lookup indexes, and restrictive student references.
- [x] 1.2 Define public rate-limit window schema keyed by one-way identifier and request-source fingerprints with bounded expiration indexes.
- [x] 1.3 Add a class sign-in token-version column and define encrypted expiring workflow staging, attendance, class-scoped guest, attestation, reporting-context, and protected student-field/credential-snapshot schema with regular-versus-guest checks and retained request metadata.
- [x] 1.4 Add a partial unique active class/student constraint, payload-bound class/idempotency constraints, agency and class references, attendance removal state, and indexes needed by later roster queries.
- [x] 1.5 Generate, review, and apply the additive Phase 5 migration without modifying existing class or reference records.

## 2. Public access security

- [x] 2.1 Add initial-token resolution and redirect to a tokenless path plus a signed, HTTP-only, short-lived class workflow context with token version, workflow nonce, and server-issued idempotency key and encrypted expiring server-side staging; use `Referrer-Policy: no-referrer`, raw-token log/analytics/error redaction, production `Secure`, `SameSite=Lax`, sign-in path scoping, same-origin checks, nonce validation, bounded cleanup, and open-class/token-version revalidation on every public action.
- [x] 2.2 Update class sign-in rotation to atomically replace the token hash and increment its version so every previously issued workflow context is invalidated immediately.
- [x] 2.3 Add remembered-device generation, hash lookup, refresh, expiration, revocation, `Not me` handling, and secure cookie behavior for regular students only.
- [x] 2.4 Add database-backed volume and failure limits for workflow creation, staging writes, current-phone lookup, prior-phone recovery, FFN/KEMSIS verification, regular confirmation, and every guest confirmation using class/source and HMAC identifier fingerprints with trusted platform request metadata.

## 3. Student identification and requirements

- [x] 3.1 Implement active-student recognition in remembered-device, normalized current-phone, changed-number recovery, and guest priority order with enumeration-safe responses.
- [x] 3.2 Implement a non-varying FFN/KEMSIS challenge that exact matches one active student by prior phone and then verifies the selected existing credential lookup hash, requires affirmative profile confirmation, encrypts the available new phone in server-side workflow staging, clears recovery on `Not me`, and applies the phone only inside successful attendance confirmation.
- [x] 3.3 Resolve the effective reporting requirement-set version for every class reporting system and compute the union of required fields and credentials.
- [x] 3.4 Add a narrowly scoped class-context-bound public update path that may add missing class-required regular-student fields or credentials but cannot overwrite existing permanent values; encrypt staged values and apply allowed additions only inside confirmation with same-transaction audit events.
- [x] 3.5 Add eligible attendance-agency resolution from active student memberships and preserve the student's explicit class selection.

## 4. Attendance transaction

- [x] 4.1 Implement class-scoped guest validation for participant name, any active catalog agency, required roster fields, and encrypted credential values without creating a student.
- [x] 4.2 Implement one locked attendance confirmation transaction that consumes server-side workflow staging and revalidates class state, token version, participant, agency, requirements, recovered-profile confirmation, new-phone uniqueness, server-issued idempotency key, and a payload fingerprint covering every staged mutation before writing any attendance facts or student updates; map a phone race to a generic recovery restart.
- [x] 4.3 Persist the rendered attestation text and version, server timestamp, sign-in method, originating IP, remembered-device reference, requirement-set versions, and protected required-field/credential snapshots.
- [x] 4.4 Return existing active attendance for regular duplicates and exact idempotent retries, reject changed payload reuse, and allow a new active record only after a retained prior attendance is removed.
- [x] 4.5 Issue or refresh remembered-device access only after successful regular attendance and record sanitized attendance security events without secret material.

## 5. Mobile sign-in workflow

- [x] 5.1 Replace the open-token placeholder with a mobile-first class sign-in shell and retain the generic unavailable page for invalid or inactive class contexts.
- [x] 5.2 Add remembered-student confirmation, bounded exact current-phone lookup, `My phone number changed`, a non-varying prior-phone plus student-selected FFN/KEMSIS challenge, affirmative profile verification, staged phone replacement, and `Not me` screens with non-enumerating validation feedback where applicable.
- [x] 5.3 Add reporting-field and credential completion plus active agency selection for regular students.
- [x] 5.4 Add the visually secondary guest form with class-required fields, credentials, agency selection, and no remembered-device option.
- [x] 5.5 Add the named attestation review, `Confirm & Sign In` action, duplicate-safe success state, expired-context restart, and accessible pending/error behavior.

## 6. Tests and verification

- [x] 6.1 Add unit tests for remembered tokens, phone and credential normalization, recovery matching, context signing, rate-limit fingerprints, requirement resolution, attestation rendering, and idempotency fingerprints that include profile confirmation and every staged mutation.
- [x] 6.2 Add integration tests for the migration, token-version invalidation, tokenless redirects and raw-token redaction, workflow cookie/nonce/origin protections, workflow/staging limits, regular and guest constraints, non-varying prior-phone plus FFN/KEMSIS recovery, profile confirmation and `Not me`, staged phone replacement, confirmation-time phone conflicts, blocked permanent-value overwrites, generic recovery failures, class-state locking, required-field/credential snapshots, public-update audits, removed-and-restored attendance, payload-bound retries, successful guest volume limits, and secret-free audit data.
- [x] 6.3 Add mobile Playwright coverage for remembered-device, current phone, changed-number recovery, profile verification, missing requirements, multiple agencies, guest fallback, `Not me`, duplicate submission, rate limiting, and inactive class access.
- [x] 6.4 Update architecture and roadmap documentation to remove Student ID/PIN access and storage, document phone recovery plus guest fallback, application-level credential and attendance-snapshot encryption, key durability, public mutation boundaries, and attendance removal semantics.
- [x] 6.5 Run lint, typecheck, unit/integration/E2E tests, migration checks, production build, and strict OpenSpec validation; resolve all failures.

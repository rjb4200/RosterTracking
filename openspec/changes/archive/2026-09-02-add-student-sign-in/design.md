## Context

Phase 4 supplies open classes, hashed class-entry tokens, reporting-system selections, and a state-limited public route. Phase 3 supplies regular students, unique normalized phones, agencies, encrypted credentials with deterministic lookup hashes, and versioned reporting requirements. See `proposal.md` and the three capability specs for Phase 5 behavior.

The public workflow handles personal data without a staff session. Remembered devices and phone lookup are convenience identification signals, while the class-specific attestation remains the attendance assertion. Attendance facts must survive later edits to student profiles and reporting requirements.

## Goals / Non-Goals

**Goals:**
- Keep every public step bound to a currently open class without storing raw class or remembered-device tokens.
- Separate reusable student identity state from class-specific attendance and guest facts.
- Make the final confirmation atomic, retry-safe, and suitable for later immutable finalization snapshots.
- Resolve reporting requirements consistently and protect credential values throughout collection and retention.
- Provide generic, rate-limited public responses that do not expose the student directory.

**Non-Goals:**
- Instructor manual attendance, roster removal, credited-hour adjustments, or completion validation.
- SMS verification, email verification, external identity providers, or multi-factor authentication.
- Automatically promoting guest participants into permanent students.
- Finalization revisions, reporting queues, official-form acceptance decisions, or PDF generation.

## Decisions

### Separate reusable access data from attendance data

Add remembered-device records beside the student aggregate. Add attendance as the class/student or class/guest join, with separate guest-participant, attestation, reporting-context, and protected field/credential-snapshot records. Regular attendance references a student; guest attendance references a class-scoped guest and never both. Attendance has active and removed states, and a partial unique index permits at most one active class/student row while preserving removed history for Phase 6.

This preserves the regular/guest identity boundary and prevents phone numbers or mutable profile fields from becoming attendance foreign keys. A single polymorphic participant table was rejected because it would blur permanent students and one-class guests.

### Lock the class and submit one attendance transaction

The confirmation service acquires a row lock on the class, verifies it is still open, revalidates all submitted identifiers against server-side context, and writes attendance, guest data when applicable, agency, reporting context, protected snapshots, attestation, request metadata, and remembered-device issuance in one transaction. Public regular sign-in may fill a missing class-required student field or credential but cannot overwrite an existing permanent value. The only existing permanent value this workflow may replace is the phone after successful prior-phone plus credential recovery and affirmative profile confirmation. These narrowly scoped mutations and their audit events occur in the same transaction; public callers never receive the general staff mutation capability. A partial unique active class/student constraint protects regular attendance independently.

The server issues a random idempotency key in the signed workflow context. Confirmation stores a keyed payload fingerprint covering class, participant, agency, attestation version, requirement data, affirmative recovered-profile confirmation, and every staged permanent mutation including a replacement phone. An exact retry returns the original result; reuse with a different fingerprint is rejected.

Writing intermediate attendance rows during the wizard was rejected because abandoned forms would create partial roster records and complicate completion checks.

### Use short-lived server context for the public wizard

The raw class token appears only on the initial entry request. After validation, the server establishes a signed, HTTP-only, short-lived context cookie and redirects to a tokenless sign-in path with `Referrer-Policy: no-referrer`; application logs, analytics, and error metadata exclude the raw token. The cookie contains only the class identifier, current sign-in token version, workflow nonce, and server-issued idempotency key. An expiring server-side workflow record keyed by the nonce retains encrypted staged phone, profile, credential, guest, and agency values; sensitive staged values never enter the cookie. The cookie is `Secure` in production, `SameSite=Lax`, and constrained to the sign-in path and workflow lifetime. State-changing actions require the signed nonce and same-origin request metadata before processing. Workflow creation and staging writes are volume-limited by class and request source. Token rotation atomically replaces the token hash and increments the class version. Every server action reloads the class and verifies its open state and matching token version. The cookie is not attendance proof and cannot replace final confirmation.

Passing the raw class token through every form was rejected because it increases accidental exposure in browser history, error reports, and form telemetry.

### Treat remembered devices as revocable lookup credentials

Remembered-device cookies contain 32 random URL-safe bytes. The database stores only SHA-256 hashes with student, creation, last-used, expiration, and revocation fields. Successful regular attendance may issue or refresh a token; guest attendance never does. Unknown or invalid tokens are cleared without a distinct public error.

Long-lived signed cookies without database state were rejected because they cannot be individually revoked and would remain valid after account deactivation.

### Recover changed phone numbers with prior record data

When a submitted new phone does not identify an active student, the workflow offers `My phone number changed`. The student enters the prior phone number, selects FFN or KEMSIS ID, and enters that value through the same generic challenge regardless of what the matched record stores. The submitted credential is normalized and matched through the existing type-scoped lookup hash without decrypting or displaying stored values. An exact match shows the student's profile and masked credentials and requires affirmative confirmation before staging the available new phone. `Not me` clears the recovery state and returns to regular or guest entry. The new phone is rechecked for uniqueness, applied, and audited only in the successful attendance transaction.

Student ID plus PIN was rejected because students without a usable regular phone pathway will use class-scoped guest entry instead. Guest data is entered for each class and never creates or updates a permanent student. Recovery that searches by name or displays candidate records was rejected because it would expose the student directory.

### Resolve and snapshot reporting context at confirmation

The workflow resolves one effective requirement-set version for each class reporting system and computes the union of required student fields and credential types. Publicly entered values are encrypted in the expiring server-side workflow record. For regular students, only missing class-required permanent values may be added; conflicting existing values require later staff correction and are retained only as submitted attendance context when appropriate. Confirmation consumes the workflow record and stores the selected requirement-set IDs plus protected snapshots of every required student-field and credential value, including class-scoped guest values. Allowed permanent additions, recovery-authorized phone replacement, and audit events occur only during final confirmation. Expired abandoned workflow records are removed by bounded cleanup.

Storing only references to mutable student credentials was rejected because a later profile correction could otherwise change which value appears in a finalized roster.

### Rate-limit using one-way fingerprints

Persist bounded attempt windows keyed by an HMAC of each normalized submitted phone or credential plus the platform-derived request IP. Apply volume and failure thresholds to workflow creation, staging writes, current-phone lookup, prior-phone recovery, credential verification, and regular attendance confirmation, plus per-class/request-source volume thresholds to every guest confirmation regardless of success. The recovery challenge does not vary based on which supported credentials exist. Exact current-phone lookup intentionally reveals only the matched name for `Is this you?`; it never returns partial matches or lists. Logs include request correlation IDs rather than raw phones, credentials, tokens, or full personal values.

An in-memory limiter was rejected because serverless instances do not share state. A new external rate-limit dependency is unnecessary for the initial department deployment.

## Risks / Trade-offs

- [Phone lookup does not prove possession and reveals whether an exact match exists] -> Keep it an identification convenience only, rate-limit all attempts, return no candidates or partial matches, require a matching prior phone and stored credential before changing a phone, require the named attestation, and preserve the sign-in method for instructor review.
- [Credential recovery accepts sensitive identifiers on a public route] -> Compare normalized values through existing type-scoped lookup hashes, never display full stored values, bind attempts to one prior-phone match, and apply source and identifier limits.
- [New-phone availability can change after recovery] -> Recheck the unique normalized phone inside confirmation and map conflicts to the same generic recovery restart rather than exposing a database error.
- [Database-backed rate limits add writes to public requests] -> Use compact expiring windows with indexes and periodic bounded cleanup rather than one row per attempt.
- [Credential snapshots duplicate sensitive values] -> Encrypt snapshots with the existing credential key, expose only masked forms outside finalization/reporting services, and never log plaintext.
- [Signed wizard context can expire mid-flow] -> Use a practical short lifetime, preserve no partial attendance, and restart at the class entry page with a generic message.
- [Abandoned workflows retain staged personal data briefly] -> Encrypt staged values, expire records quickly, index expiration, and run bounded cleanup during public workflow traffic.
- [Shared or replaced devices can identify the wrong student] -> Show the recognized name for confirmation, provide `Not me`, and revoke the local token when the user rejects it.
- [Concurrent submissions can contend on one class row] -> Keep the final transaction short and perform non-mutating form validation before acquiring the lock.
- [All active agencies are available to guests] -> Keep guest selection simple for the single department, retain the selected agency snapshot at attendance, and let staff correct roster entries in Phase 6.

## Migration Plan

1. Add the class token-version column plus remembered-device, rate-limit, guest-participant, attendance, attestation, reporting-context, and protected snapshot tables and constraints in one additive migration.
2. Deploy schema and server services before exposing the expanded public workflow; existing class tokens continue returning the current generic page until the application deploy completes.
3. Seed no remembered tokens; existing normalized phones and credential lookup hashes support regular lookup and changed-number recovery without data conversion.
4. Verify class-state locking, idempotent retry behavior, encryption round trips, and generic failure responses on an isolated database branch.
5. Roll back application code independently if needed; retain additive tables and any attendance already captured rather than destructively reverting records.

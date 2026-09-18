# Roster Tracking Architecture

## Status

This document records approved architectural decisions. The application and staff-authentication foundation is implemented; later training-roster capabilities remain phased work.

## Product Scope

The application is a single-department system for managing internal and off-site Fire/EMS training. It is not initially a multi-tenant SaaS product.

The application will be a modular monolith deployed as one Next.js application. Neon PostgreSQL is the primary system of record.

## Technology Decisions

- Next.js App Router with strict TypeScript
- React with Tailwind CSS and shadcn/ui
- Neon PostgreSQL
- Drizzle ORM and reviewed SQL migrations
- Auth.js credentials authentication for staff
- Vitest for unit and integration tests
- Playwright for critical end-to-end workflows
- `pdf-lib` for future official roster generation
- Vercel Fluid Compute using the Node.js runtime

Application runtime database access will use a small `pg` pool managed with Vercel's `attachDatabasePool()`. Migrations will use a separate direct Neon connection and will run once from CI, never during application startup.

## Staff Authentication

Staff accounts are separate from student records, even when an instructor is also a student.

Staff authentication will use a username and password with:

- normalized unique usernames
- Argon2id password hashes
- encrypted, HTTP-only cookie sessions
- one-year session expiration so active staff remain signed in across browser sessions
- database account-status and session-version checks that revoke access after disablement or password reset
- server-side role and permission checks
- administrator-controlled password reset and account deactivation

MFA and external identity providers are not required for the initial release.

Initial staff roles are Instructor, Training Major, and Administrator. All grant `staff.access`; instructors, Training Majors, and administrators have class-management permission, while reporting and finalization permissions remain deferred. Student access does not use a staff account. Authorization uses permission records rather than hard-coded role-name checks so more staff permission levels can be added later.

## Student Identification

Regular student sign-in is the preferred flow. Student sign-in pathways, in priority order:

1. Remembered browser device
2. Mobile phone lookup
3. Changed-number recovery using the prior phone plus FFN or KEMSIS ID
4. Guest sign-in when no regular student record can be used
5. Instructor manual addition

Phone numbers may be unique for the initial department deployment. The data model must not embed phone numbers into attendance or other foreign keys, so relaxing that constraint later remains a migration rather than a redesign.

Remembered-device cookies contain a random token. Only a cryptographic hash of that token is stored in the database. A remembered device is a convenience signal, not proof of attendance. A new phone number can be linked only after an exact active prior-phone match, an exact FFN or KEMSIS ID match selected by the student, and affirmative profile confirmation. The new phone is rechecked and applied only inside the successful attendance transaction.

Lookup and recovery responses must not expose lists of students or full credential values. The changed-number challenge always offers FFN and KEMSIS choices, without disclosing which credentials a matched record has. Guest sign-in is visually secondary, stores class-specific participant data rather than creating or updating a permanent student, and requires roster information again for each class.

## Agencies

Agencies form one department catalog shared by class reporting and student membership; there is no separate class-agency list or student-agency list to maintain.

Every class records one required host agency from that catalog, selected during class creation for every delivery method including online. The host agency is the agency the class is reported under, including when a student is a guest at another agency's training. A class cannot open without an active host agency.

A student may belong to multiple agencies. Memberships are the student's preferred agencies rather than a restriction: regular sign-in defaults to the class host agency when the student belongs to it and otherwise offers the student's active memberships together with the active agency catalog. Instructors with class-management access may create and edit agencies, including inline during class setup; agencies are never deleted, only deactivated.

## Attendance Attestation

Attestations are class-specific and intentionally short. The initial text is:

> I confirm that I am [Student Name] and attended this class.

The action button is `Confirm & Sign In`.

Each confirmation stores the exact text, text version, server timestamp, sign-in method, originating IP address, and remembered-device identifier when applicable. No reusable handwritten signature image is stored. Whether this attestation can replace initials or signatures on official Kentucky forms requires confirmation from the responsible agencies.

## Privacy and Security

The system contains personal information but is not expected to contain Social Security numbers, payment data, or similarly high-risk secrets.

Controls include:

- HTTPS and secure cookies
- server-side authorization and validation
- parameterized queries through Drizzle
- database-backed limits for public workflow creation, staging writes, phone lookup, changed-number recovery, and attendance confirmation
- unpredictable class sign-in tokens stored as hashes
- short-lived signed workflow cookies and encrypted, expiring server-side workflow state
- tokenless sign-in pages after the initial QR token is resolved, with no-referrer responses and raw-token redaction from application telemetry
- masked credential display
- application-level AES-GCM encryption for staged sign-in data, attendance snapshots, and credential values, in addition to Neon encryption at rest
- secrets stored only in environment variables
- no database credentials in browser code
- audit logging for important mutations
- sanitized logs that exclude passwords, raw class/device tokens, phone numbers, and full credential values

The credential encryption key is required for credential, workflow-state, and attendance-snapshot decryption. It must be securely backed up and retained for as long as protected attendance records must remain readable. Signing and rate-limit HMAC keys are purpose-separated derivations from the durable authentication secret; key rotation requires a planned versioned migration rather than replacing an environment value without preserving historical decryption capability.

Public sign-in actions may add only missing class-required student fields or credentials. They cannot replace existing permanent profile data. The one exception is a verified changed-phone recovery. Every public mutation reloads the current open class and token version, validates same-origin request metadata and the signed workflow nonce, and writes the relevant attendance facts and audit event in the same transaction.

## Data Durability and Retention

Avoiding data loss is the primary operational concern.

- Core records use deactivation or status changes instead of hard deletion.
- Attendance, attestations, audit logs, and finalization revisions have no automatic deletion policy initially.
- Attendance removal is a retained state change with a staff actor and reason; it never deletes the original attendance or attestation facts. A later attendance may become active for the same class/student only after the prior record is retained as removed.
- The instructor roster is available only to staff assigned to the class. Manual attendance records the instructor and method, defaults credit to the sum of scheduled components, and keeps guests scoped to the class.
- Credit adjustments are bounded from zero through the scheduled total and retain an actor, timestamp, and reason whenever they differ from the default. Completing an open class requires active attendance with valid credit and reporting context.
- Finalized roster snapshots are immutable and retained indefinitely unless a future legal retention policy requires otherwise.
- Reopening a class never deletes or overwrites a prior finalization revision.
- Neon point-in-time recovery and scheduled snapshots will be enabled at the production plan's supported retention level.
- Periodic logical database exports will be stored separately from Neon.
- Backup restoration will be tested on a schedule; an untested backup is not considered sufficient.

Backup retention and record retention are separate: finite backup history does not remove live application records.

## Historical Accuracy

Finalization creates a new immutable revision containing snapshots of:

- class, course, training code, site, schedule, and delivery details
- instructor names and form-relevant instructor data
- each student's name
- the agency selected for that attendance
- credentials used for each selected reporting system
- scheduled and credited hours
- attendance and attestation facts

Editing a current student, agency, credential, course, or site cannot change an existing finalized revision. Re-finalizing after an authorized reopen creates another revision and preserves all prior revisions.

## Official Form Verification

The supplied documents establish candidate form fields but not all governing rules. Before implementing official PDFs, verify:

- current KFS-1A revision and training-code catalog
- current KBEMS roster revision; the supplied form identifies itself as KBEMS-E16 (9/2012)
- acceptance of electronic attendance attestations in place of initials or handwritten signatures
- instructor signature requirements
- hour rounding and partial-credit rules
- correction and resubmission procedures
- required retention periods
- authoritative Fire Commission, KBEMS/KEMSIS, and FEMA field mappings

No unverified official requirement will be encoded as a business rule.

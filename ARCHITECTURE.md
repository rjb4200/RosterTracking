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
- Private S3-compatible object storage behind a storage adapter
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
3. Record recovery after a phone-number change
4. Student ID and unique PIN
5. Guest sign-in when no regular student record can be found
6. Instructor manual addition

Phone numbers may be unique for the initial department deployment. The data model must not embed phone numbers into attendance or other foreign keys, so relaxing that constraint later remains a migration rather than a redesign.

Remembered-device cookies contain a random token. Only a cryptographic hash of that token is stored in the database. A remembered device is a convenience signal, not proof of attendance.

PINs are hashed with Argon2id and are never stored or displayed in plaintext after creation. Lookup and recovery responses must not expose lists of students or full credential values. Guest sign-in is visually secondary, stores class-specific participant data rather than creating a permanent student automatically, and requires roster information again for each class.

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
- rate limiting for public lookup and PIN attempts
- unpredictable class sign-in tokens stored as hashes
- masked credential display
- encryption at rest provided by Neon and object storage
- secrets stored only in environment variables
- no database credentials in browser code
- audit logging for important mutations
- sanitized logs that exclude passwords, PINs, raw device tokens, and full credential values

Application-level field encryption is not required initially. This decision can be revisited if the sensitivity or regulatory requirements increase.

## Data Durability and Retention

Avoiding data loss is the primary operational concern.

- Core records use deactivation or status changes instead of hard deletion.
- Attendance, attestations, audit logs, finalization revisions, and generated-roster metadata have no automatic deletion policy initially.
- Finalized roster snapshots are immutable and retained indefinitely unless a future legal retention policy requires otherwise.
- Reopening a class never deletes or overwrites a prior finalization revision.
- Generated files use immutable object keys, object versioning, and checksums.
- Neon point-in-time recovery and scheduled snapshots will be enabled at the production plan's supported retention level.
- Periodic logical database exports will be stored separately from Neon.
- Backup restoration will be tested on a schedule; an untested backup is not considered sufficient.
- Object storage versioning and lifecycle rules must not automatically delete official roster files.

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

Editing a current student, agency, credential, course, or site cannot change an existing finalized revision. Re-finalizing after an authorized reopen creates another revision and preserves all prior revisions and generated documents.

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

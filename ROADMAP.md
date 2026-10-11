# Implementation Roadmap

## Working Rules

- Implement one coherent vertical slice at a time.
- Add migrations from the first database change.
- Enforce important rules in domain services and database constraints.
- Write audit records in the same transaction as the associated change.
- Update `ARCHITECTURE.md` when a durable decision changes.
- Do not implement official roster PDFs until source forms and mappings are verified.

## Phase 1: Foundation

- [x] Create the Next.js TypeScript application
- [x] Add formatting, linting, Vitest, and Playwright
- [x] Establish modular-monolith folder boundaries
- [x] Configure Drizzle and generated SQL migrations
- [x] Add `.env.example` without secrets
- [x] Configure Neon runtime and migration connections
- [x] Add package checks for types, lint, tests, and migration consistency
- [x] Document local development and deployment

## Phase 2: Staff Identity and Authorization

- [x] Implement username/password staff login with Auth.js
- [x] Add Argon2id password hashing
- [x] Add one-year encrypted cookie sessions with database revocation checks
- [x] Add users, roles, permissions, and role assignments
- [x] Implement server-side authorization policies
- [x] Add administrator password reset, deactivation, unlock, and session-version revocation
- [x] Add authentication and authorization audit events

## Phase 3: Core Reference Data

- [x] Add students
- [x] Add agencies and student-agency memberships
- [x] Add credential types and student credentials
- [x] Add reporting systems and versioned requirement sets
- [x] Add training codes, courses, and training sites
- [x] Import verified Fire Commission training codes
- [x] Add searchable administration screens

## Phase 4: Class Creation

- [x] Add classes, class components, and instructors
- [x] Implement the stepped class-creation wizard
- [x] Add delivery methods and reporting-system selection
- [x] Implement draft, open, completed, finalized, and cancelled states
- [x] Generate class-specific random sign-in tokens and QR codes
- [x] Add lifecycle authorization and audit events

## Phase 5: Student Sign-In

- [x] Add remembered-device token support
- [x] Implement primary phone lookup and changed-number recovery through prior phone plus FFN or KEMSIS ID
- [x] Add secondary guest sign-in that collects class-specific roster data without creating or updating a permanent student
- [x] Resolve versioned reporting requirements during sign-in
- [x] Collect missing requirements and retain encrypted attendance snapshots
- [x] Allow selection of the attendance agency
- [x] Record the short class-specific attestation
- [x] Make attendance submission transactional and idempotent
- [x] Add encrypted workflow staging, rate limits, enumeration protections, and tokenless public context handling
- [x] Add mobile Playwright coverage for every sign-in pathway

## Phase 6: Instructor Roster

- [x] Add the live class roster
- [x] Add instructor manual attendance
- [x] Add audited attendance removal
- [x] Add credited-hour adjustments and reasons
- [x] Add completion validation
- [x] Add instructor-focused tablet and desktop tests
- [x] Add an action-oriented instructor dashboard with direct roster, student QR, and review actions

## Phase 7: Finalization and Reporting

- [x] Create immutable finalization revisions and snapshots
- [x] Lock normal editing after finalization
- [x] Add authorized reopen with required reason
- [x] Preserve and supersede prior revisions correctly
- [x] Add independent Fire, KBEMS, and FEMA reporting statuses
- [x] Add pending and needs-correction queues
- [x] Record reporting actor, time, reference number, and notes
- [x] Include students on Fire rosters only when they have a valid FFN while retaining attendance for other participants

## Phase 8: Official Rosters

- [ ] Verify current official forms and acceptance rules
- [ ] Add versioned roster-template metadata
- [ ] Implement private object storage
- [ ] Map finalized snapshots to verified form fields
- [ ] Generate Fire Commission PDFs with `pdf-lib`
- [ ] Generate KBEMS PDFs with `pdf-lib`
- [ ] Store immutable object keys, hashes, sizes, and generation metadata
- [ ] Add fixture-based PDF mapping tests

## Phase 9: Production Hardening

- [ ] Configure production security headers and rate limits
- [ ] Enable Neon snapshots and point-in-time recovery
- [ ] Automate separate logical database exports
- [ ] Enable object versioning without automatic official-record deletion
- [ ] Document and test database restoration
- [ ] Add monitoring and error reporting
- [ ] Perform accessibility and mobile-device testing
- [ ] Review audit coverage and sensitive logging
- [ ] Document operational recovery procedures

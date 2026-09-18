## 1. End-to-end database

- [x] 1.1 Provision an empty end-to-end database on the existing test branch alongside the integration database.
- [x] 1.2 Add the end-to-end database URL to local environment configuration and to the environment example file so a new checkout can run the browser suite.

## 2. Database reset tooling

- [x] 2.1 Add a reset script that takes a target database URL, refuses to run against the production host or database, applies the committed migrations, clears application tables, and applies committed seed data.
- [x] 2.2 Make the reset script tolerate a suspended database compute by retrying its first connection once.
- [x] 2.3 Wire the reset script so the integration database and the end-to-end database can each be prepared before their suite runs.

## 3. Shared browser test harness

- [x] 3.1 Add one database-resolution helper for browser specs and replace the direct connection-string reads in the class-creation, instructor-roster, and foundation specs.
- [x] 3.2 Add a shared sign-in helper that waits until navigation leaves the login route, and use it in every spec that signs in.
- [x] 3.3 Configure the browser server to use only the end-to-end database.
- [x] 3.4 Repair stale locators that only surfaced once sign-in stopped racing: exact-match the Course and Training site labels, and assert the Live class eyebrow as text rather than a heading.
- [x] 3.5 Fix the class wizard so advancing from the reporting step cannot submit the form, and assert in the creation spec that the review step appears before the draft is created.

## 4. Read-only smoke coverage

- [x] 4.1 Tag a read-only smoke subset covering staff sign-in, the workspace landing, the class list, the reporting queue, class detail, and the public student sign-in page.
- [x] 4.2 Confirm the smoke subset creates no domain records so it can run against a database that is not reset. Staff sign-in writes its usual login audit event and last-login timestamp, so only domain tables are held constant.

## 5. Commands and documentation

- [x] 5.1 Add the fast check command that runs linting and static type checking alone.
- [x] 5.2 Add the combined verification command that prepares and runs the integration suite and runs linting, static types, unit tests, and the production build.
- [x] 5.3 Add the full verification command that adds the smoke subset and the browser suite, plus a standalone smoke command.
- [x] 5.4 Record the verification commands where future changes will find them.

## 6. Verification

- [x] 6.1 Run the combined verification command in a correctly configured environment and confirm every included check passes without production credentials.
      Found during verification: the official-roster PDF unit test runs near the 5s default timeout and failed intermittently, which made `verify` unreproducible. Gave the unit suite a realistic timeout budget in `vitest.config.ts`.
- [x] 6.2 Run the browser suite twice in succession and confirm both runs report the same results.
- [x] 6.3 Run the smoke subset against a database that has not been reset and confirm no domain records are written, allowing for the staff sign-in audit event.
- [x] 6.4 Run strict OpenSpec validation for the change.
- [x] 6.5 Confirm the browser suite is green after the wizard fix and that the class creation spec reaches the review step before creating the draft.

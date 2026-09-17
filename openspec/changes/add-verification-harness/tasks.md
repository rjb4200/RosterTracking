## 1. End-to-end database

- [ ] 1.1 Provision an empty end-to-end database on the existing test branch alongside the integration database.
- [ ] 1.2 Add the end-to-end database URL to local environment configuration and to the environment example file so a new checkout can run the browser suite.

## 2. Database reset tooling

- [ ] 2.1 Add a reset script that takes a target database URL, refuses to run against the production host or database, applies the committed migrations, clears application tables, and applies committed seed data.
- [ ] 2.2 Make the reset script tolerate a suspended database compute by retrying its first connection once.
- [ ] 2.3 Wire the reset script so the integration database and the end-to-end database can each be prepared before their suite runs.

## 3. Shared browser test harness

- [ ] 3.1 Add one database-resolution helper for browser specs and replace the direct connection-string reads in the class-creation, instructor-roster, and foundation specs.
- [ ] 3.2 Add a shared sign-in helper that waits until navigation leaves the login route, and use it in every spec that signs in.
- [ ] 3.3 Configure the browser server to use only the end-to-end database.

## 4. Read-only smoke coverage

- [ ] 4.1 Tag a read-only smoke subset covering staff sign-in, the workspace landing, the class list, the reporting queue, class detail, and the public student sign-in page.
- [ ] 4.2 Confirm the smoke subset performs no writes so it can run against a database that is not reset.

## 5. Commands and documentation

- [ ] 5.1 Add the fast check command that runs linting and static type checking alone.
- [ ] 5.2 Add the combined verification command that prepares and runs the integration suite and runs linting, static types, unit tests, and the production build.
- [ ] 5.3 Add the full verification command that adds the smoke subset and the browser suite, plus a standalone smoke command.
- [ ] 5.4 Record the verification commands where future changes will find them.

## 6. Verification

- [ ] 6.1 Run the combined verification command in a correctly configured environment and confirm every included check passes without production credentials.
- [ ] 6.2 Run the browser suite twice in succession and confirm both runs report the same results.
- [ ] 6.3 Run the smoke subset against a database that has not been reset and confirm no application rows are written.
- [ ] 6.4 Run strict OpenSpec validation for the change.

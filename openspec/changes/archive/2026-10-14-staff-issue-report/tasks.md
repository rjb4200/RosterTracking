## 1. GitHub issue client

- [x] 1.1 Add a server-only module that creates an issue through the GitHub API, reading `GITHUB_ISSUE_TOKEN`, and throws a plain, non-leaking error when unconfigured or rejected.
- [x] 1.2 Define the repository target, the token env name, and the category-to-label mapping in one place.

## 2. Context and server action

- [x] 2.1 Build the auto-captured context (route, environment, staff identity and role, timestamp, correlation id, user agent, and the class when on a class page).
- [x] 2.2 Add a server action that validates the input, composes the body, and creates the issue; it refuses when the token is not configured.

## 3. Staff UI

- [x] 3.1 Add a "Report an issue" affordance in the staff header that opens a dialog form (category, subject, description) with the personal-data warning.
- [x] 3.2 Show the created issue's link on success, and hide the affordance when the token is not configured.
- [x] 3.3 Add a "Report this problem" action to the staff error boundary that attaches the correlation id (not the raw error message).

## 4. Tests

- [x] 4.1 Unit-test the context/body builder and the category-to-label mapping.
- [x] 4.2 Unit-test the client's unconfigured behavior: it throws and never includes the token.
- [x] 4.3 E2E: a staff member opens the form and files a report, and the affordance is hidden when the token is unconfigured.

## 5. Verification

- [x] 5.1 Run lint, typecheck, unit and integration suites, and the build.
- [x] 5.2 Run the affected Playwright specs.

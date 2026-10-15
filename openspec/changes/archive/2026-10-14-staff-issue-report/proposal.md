## Why

Staff have no way to report a problem from inside the app: they must leave it, find the repository, and write an issue by hand, losing the page, user, and error context. A staff-only report form that files a GitHub issue directly makes reports actionable and keeps the context that matters for diagnosis.

## What Changes

- A staff-only **"Report an issue"** affordance in the staff header opens a form with a category, a subject, and a description.
- The staff error boundary offers a **"Report this problem"** action for the page that failed.
- Submitting creates a GitHub issue in the application's repository through the GitHub API, using a **server-only token**, with a category label and auto-captured context (route, environment, staff user and role, timestamp, correlation id, user agent, and the class when on a class page).
- The form warns staff not to include student names, phone numbers, or credentials, and shows the created issue's link on success.
- When the token is not configured, the affordance is not offered (the feature degrades rather than erroring).

## Capabilities

### New Capabilities
- `issue-reporting`: a staff-only in-app report that files a GitHub issue with a category, the reporter's description, and auto-captured context, and degrades when unconfigured.

### Modified Capabilities
<!-- none: the staff error boundary gains a report action, which this new capability defines. -->

## Impact

- New module for the GitHub issue client and service (mirroring the server-only `notifications/client.ts` external-call pattern).
- `src/server/env.ts` / configuration: `GITHUB_ISSUE_TOKEN` (server-only, optional), repository target, and category labels.
- Staff shell header (`src/app/staff/(protected)/layout.tsx`) gains the affordance; `src/app/staff/(protected)/error.tsx` gains the report action.
- A server action that creates the issue; no database schema change.
- Specs: new `issue-reporting`.

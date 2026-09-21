# Verification

Four commands, ordered by cost. Use the cheapest one that answers your question.

```text
npm run check        lint + static types                 ~5s    no database, no browser
npm run verify       check + unit + integration + build  ~3m    needs TEST_DATABASE_URL
npm run verify:full  verify + smoke + browser suite      ~7m    needs E2E_DATABASE_URL
npm run smoke        read-only critical pages            ~1m    needs a running database
```

## When to run what

| Moment | Command | Answers |
| --- | --- | --- |
| After each edit | `npm run check` | Did I typo, or break a type? |
| End of a change | `npm run verify` | Did I break a module or the build? |
| Before pushing | `npm run verify:full` | Did I break a user journey? |
| Spot check a live environment | `npm run smoke` | Are the critical pages still rendering? |

`npm run verify` deliberately excludes the browser suites so the common case stays
fast and deterministic. Run `npm run verify:full` before pushing.

## Test databases

The mutable suites never touch production, and they do not share a database with
each other.

| Suite | Environment variable | Prepared by |
| --- | --- | --- |
| Integration (`test:integration`) | `TEST_DATABASE_URL` | `npm run db:reset:integration` |
| Browser (`test:e2e`, `smoke`) | `E2E_DATABASE_URL` | `npm run db:reset:e2e` |

`verify` and `verify:full` run the matching reset for you. Run the reset scripts
directly when you want a clean database before a targeted test run.

### What a reset does

1. Connects to the target database (retrying once, because a suspended Neon
   compute can time out the first attempt).
2. Applies the committed migrations from `drizzle/`.
3. Truncates the application tables in the `public` schema.
4. Loads the committed foundation and reference seed data.

Schema comes from the repository, never from Neon branch synchronization: a Neon
branch does not follow migrations applied to its parent. Every schema change must
land as a committed migration.

### Production guard

`scripts/reset-test-db.ts` refuses to run when the target database is named
`RosterGenerator` or matches `DATABASE_URL` / `DATABASE_URL_DIRECT`. It also
requires an explicit target (`--database=integration`, `--database=e2e`, or
`--url=...`) and never defaults to a database.

## Prerequisites

1. Install the browser once: `npx playwright install chromium`.
2. Set `TEST_DATABASE_URL` and `E2E_DATABASE_URL` to **different** databases.
3. Set `E2E_STAFF_USERNAME` and `E2E_STAFF_PASSWORD` for a staff account in the
   end-to-end database. The browser suite skips itself when these are absent.
4. Bootstrap that staff account in the end-to-end database before the first run
   (see the README's staff account section), for example by pointing
   `DATABASE_URL_DIRECT` at it and running `npm run admin -- bootstrap`.

## The smoke subset

`npm run smoke` covers the public class sign-in entry, staff sign-in and the
workspace landing, the class list, class detail (when a class exists), and the
reporting queue (when the signed-in account can see it).

The smoke journeys only read. They never submit a form, so the subset can run
against a database that has not been reset — including a live environment — to
confirm the critical pages still render.

## The browser suite

`npm run test:e2e` runs the full Playwright suite against `E2E_DATABASE_URL`.
Every spec resolves its database through `tests/e2e/support/database.ts` and
signs in through `tests/e2e/support/auth.ts`, so fixtures and the application
under test always agree on the database and the session is established before
any spec navigates.

Specs that mutate shared data run once on the `chromium` project; the rest run on
both `chromium` and `mobile-chrome`.

By default the suite runs against `next dev`. Set `E2E_PRODUCTION=1` to build and
serve a production bundle instead, which is required to reproduce behavior that
only appears with production cookie, prefetch, and caching semantics.

## Official roster verification

Verified as part of the Phase 9 hardening review (issue #2).

**The approved templates are the ones used.** `service.test.ts` hashes each
template asset against the `sourceChecksum` recorded in `mappings.ts`, so a
substituted or edited template fails the suite:

- `kfs-1a-october-2023.pdf`
- `kbems-e16-september-2012.pdf`

**Every mapped field exists in the approved template.** The same test loads each
template's AcroForm and asserts that every field name referenced in the mapping
and every intentionally blank field is present. A mapping typo therefore fails
rather than silently leaving a box empty.

**Signature and initial fields are never populated electronically.** The mapping
lists them as `blankFields`, and the rendered output is asserted to carry no
AcroForm field values.

**Output is generated from real data end to end.** With a finalized class in the
end-to-end database, authorized staff downloaded a real `kfs-1a-*.pdf` through
the application, and the download action was asserted for both forms.

**No discrepancies were found.**

**Sign-off.** Approved by the Administrator on 2026-09-21. Approval authority is
an Administrator or a Training Major; an instructor verifies their own class.
The sign-off covers the field mapping and layout above. It is not a legal
review of the agency forms themselves.

## Known issues

- The class creation wizard's action row overlaps the step content on a narrow
  mobile viewport, so a pointer click on `Next` from the Training Site step is
  intercepted by the step section. Class creation and roster finalization
  therefore run on the `chromium` project only. This is a layout defect in the
  wizard, not a test-harness problem, and needs its own fix (issue #13).

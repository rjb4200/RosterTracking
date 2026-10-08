## Context

Four reference catalogs share the same data lifecycle but split into two editing patterns today: agencies and sites use a clean list plus a dedicated record page, while training codes and curricula embed state actions and a collapsible edit form in each list row. The accounts screens use the dedicated-page pattern too. The existing specs — `reference-data-lifecycle` (states and permissions), `course-catalog` (code/site/curriculum content), and `agency-management` — describe record behavior but none owns the screen pattern; `staff-account-management` set the precedent of capturing a page split as a requirement, so this change adds a `reference-catalog-management` capability for the shared pattern.

Only `getAgency` and `getSite` exist in `src/modules/reference/services.ts`; the record pages for training codes and curricula need matching lookups.

## Goals / Non-Goals

**Goals:**
- One screen pattern across all four catalogs: searchable list → record page; dedicated new-record page.
- Remove inline editing and inline state actions from the training-code and curriculum lists.
- Align list table styling and remove the stray bottom-of-file `import Link` in the agencies and sites list pages.

**Non-Goals:**
- Changing the active/inactive/archived rules, permissions, or the catalog data model.
- Changing the inline "create while configuring a class" flows, which live inside the class wizard.
- Extracting a shared generic record-page component (deferred; see Open Questions).

## Decisions

**D1 — Dedicated record pages everywhere (not inline rows).** Matches the preferred agencies/sites pattern and the accounts screens, keeps lists scannable, and scales as record fields grow. Alternative: move everything to inline editing — rejected because the user prefers the agencies flow and inline forms make rows tall and noisy.

**D2 — Create on `/staff/<catalog>/new`.** Consistent with `/staff/accounts/new`. In the App Router a static `new` segment takes precedence over the `[id]` dynamic segment, so `/staff/agencies/new` and `/staff/agencies/[id]` coexist. Alternative: keep the create form at the bottom of the list — rejected for consistency.

**D3 — Mirror the agencies/sites record-page structure per catalog.** Heading with the record's label, a Back link, the Deactivate/Reactivate and Archive actions, and an "Edit \<record\>" section holding the form. Each catalog keeps its own page and form rather than a shared generic component, to limit blast radius since forms and server actions differ. Alternative: a shared `ReferenceRecordPage` shell — deferred.

**D4 — Link the primary label.** Agencies/sites link the name, training codes link the code, and curricula link the program title (the more specific identity; publisher is shown alongside). The curricula record-page heading shows the program title with the publisher as context.

**D5 — Standardize list tables on `reference-table`.** It wraps cell text (`white-space: normal`) so the wider catalogs fit; horizontal overflow is already handled globally by `.admin-content [data-slot="table-container"] { min-width: 0 }`.

**D6 — Add `getTrainingCode` and `getCurriculum`.** Mirror `getAgency`/`getSite`: select by id, return the row or `null`, and do not filter archived (matching the existing lookups; archived records are hidden from lists, not from direct links).

**D7 — Archive redirects to the list.** After archiving, redirect to the catalog list and revalidate both the record path and the list path, so the now-archived record page is not left to 404 (the same fix already applied to staff accounts). State changes other than archive revalidate in place.

**D8 — Tidy the stray imports.** Move the bottom-of-file `import Link` in `agencies/page.tsx` and `sites/page.tsx` to the top with the other imports.

## Risks / Trade-offs

- [Editing now takes an extra click] → Link the primary list cell and provide a Back link so reaching and leaving a record is one click each.
- [Four similar record pages can drift] → Keep the structure mirrored; extract a shared shell later if it drifts (Open Questions).
- [`new` route could shadow `[id]`] → App Router static segments win; verify with typecheck/build and, where available, a route test.
- [Tests are mostly service-level] → The behavior change is largely presentation; cover the new lookups with integration tests and rely on typecheck/build for the pages.

## Migration Plan

UI-only; no schema or data migration. Deploy the route and page changes together. Rollback is reverting the commit.

## Open Questions

- Whether to extract a shared record-page component once all four catalogs use the pattern.

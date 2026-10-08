## Why

The department's reference catalogs — agencies, training sites, training codes, and approved curricula — are edited two different ways. Agencies and sites use a clean list whose rows link to a dedicated record page, while training codes and curricula cram their state actions and a collapsible edit form into each list row. The split is harder to learn and maintain, and two list pages carry a stray `import Link` at the bottom of the file.

## What Changes

- Adopt one screen pattern for every reference catalog: a searchable list whose rows link to a per-record page, a dedicated new-record page for creating, and a record page that holds the edit form and the record's state actions.
- Move training-code and curriculum editing off the list rows onto dedicated record pages, and simplify their lists by dropping the per-row Actions column.
- Move every catalog's create form from the bottom of its list onto a dedicated new-record page (agencies, sites, training codes, curricula).
- Add `getTrainingCode` and `getCurriculum` lookups so each record page can load its record.
- Tidy the stray `import Link` at the bottom of the agencies and sites list pages, and align the list table styling across all four catalogs.

## Capabilities

### New Capabilities
- `reference-catalog-management`: the shared list / new-record / record-page screen pattern used by the department's reference catalogs (agencies, training sites, training codes, approved curricula).

### Modified Capabilities
<!-- None: the lifecycle, catalog-content, and agency requirements keep their behavior; this change only adds the shared screen pattern as a new capability. -->

## Impact

- Staff routes: `/staff/agencies`, `/staff/sites`, `/staff/training-codes`, `/staff/curricula` (each gains a `new` page and a `[id]` page where missing).
- `src/modules/reference/services.ts`: add `getTrainingCode` and `getCurriculum`.
- List pages, forms, and server actions for the four catalogs.

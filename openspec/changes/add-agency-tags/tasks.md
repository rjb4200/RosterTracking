## 1. Schema and database

- [x] 1.1 Add `agencyTags` and `agencyTagLinks` tables to `src/server/db/schema/reference.ts` — `code` unique index on tags, `(agency_id, tag_id)` primary key on links, `subtype` nullable text; export the inferred types.
- [x] 1.2 Generate the migration that adds the two tables (`npm run db:generate`) and apply it (`npm run db:migrate`) without dropping `agencies.type` yet.
- [x] 1.3 Export the new tables from `src/server/db/schema/index.ts` so services and seeds can import them.

## 2. Reference vocabulary

- [x] 2.1 Add `AGENCY_TAG_CODES` and `AGENCY_OTHER_SUBTYPES` (code → display label) to `src/modules/reference/constants.ts`.
- [x] 2.2 Seed the six tag rows idempotently in `src/server/db/reference-seed.ts` (`onConflictDoUpdate` on `code`).
- [x] 2.3 Add a read helper that lists active tags for the form/pickers.

## 3. Service layer

- [x] 3.1 Extend `agencyInput` in `src/modules/reference/services.ts` with `tagIds: string[]` and `otherSubtype`, and remove `type`.
- [x] 3.2 In `createAgency`, within the existing transaction, validate the tags (exist + active) and subtype (only with `other`, within the fixed set), then replace the agency's links.
- [x] 3.3 Apply the same validation and link replacement in `updateAgency`.
- [x] 3.4 Extend `getAgency` / `listAgencies` to join and return each agency's tags and resolved subtype.

## 4. Colour tokens

- [x] 4.1 Add `--tag-*` colour tokens (light and dark) to `src/app/globals.css` for each tag code.
- [x] 4.2 Add a tag-code → badge-colour mapping used by the agency screens.

## 5. Agency form

- [x] 5.1 Replace the free-text `Type` input in `agencies/agency-form.tsx` with a checkbox list of active tags (existing `checkbox-list` pattern).
- [x] 5.2 Add the conditional Other-subtype `<select>` that appears when `other` is checked.
- [x] 5.3 Update `agencies/actions.ts` to pass `tagIds` and `otherSubtype` into the service calls.

## 6. Agency display

- [x] 6.1 Render tag badges in the agency list (`agencies/page.tsx`), showing the subtype text or "Other" and the resolved colour.
- [x] 6.2 Render tag badges on the agency record page (`agencies/[id]/page.tsx`).

## 7. Data migration

- [x] 7.1 Write a one-off backfill script that maps each agency's legacy `type` to a tag by trimmed, case-insensitive name match, falling back to `other`, and inserts links idempotently.
- [x] 7.2 Run the backfill on existing data and verify the linked-tag counts.
- [x] 7.3 Add a follow-up migration dropping `agencies.type` and remove its remaining references (including the `type: "Fire"` insert in `tests/integration/database.test.ts`).

## 8. Tests and verification

- [x] 8.1 Integration test: create and update an agency with several tags and confirm the tags round-trip.
- [x] 8.2 Integration test: a subtype is rejected without `other`, and accepted (and rendered) with `other`.
- [x] 8.3 Test: the backfill maps a legacy `type` value to the expected tag and falls back to `other` for unknown values.
- [x] 8.4 Run `npm run verify` (lint, typecheck, unit, integration) and fix any failures.

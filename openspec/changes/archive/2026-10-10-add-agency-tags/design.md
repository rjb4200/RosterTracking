## Context

See `proposal.md` - Why. Grounding facts from the current code:

- `agencies.type` is a single nullable `text` column (`src/server/db/schema/reference.ts:51`)
  written by `createAgency` / `updateAgency` (`src/modules/reference/services.ts`)
  and rendered only in the agency list (`agencies/page.tsx:83`). It is not part
  of any existing spec requirement.
- The house pattern for controlled vocabularies is a `code`-keyed lookup table
  seeded from code (`credential_types`, `reporting_systems`), managed by
  `reference-seed.ts`, with `isActive` and deactivate-not-delete.
- The house pattern for many-to-many is a join table (`student_agencies`).
- Multi-select already exists as a checkbox list producing an id array
  (`class-form.tsx:115-136`).
- `Badge` exposes semantic variants backed by OKLCH tokens in `globals.css`;
  there is no multi-hue palette today (`--chart-*` are grayscale).
- Migrations are Drizzle-generated SQL in `drizzle/` applied by `db:migrate`;
  reference rows are seeded idempotently by `reference-seed.ts`.

## Goals / Non-Goals

**Goals:**
- Let an agency carry multiple coloured service tags from a fixed vocabulary.
- Prevent free-text drift by making tags a selection, not an entry.
- Support `Other` with one optional fixed subtype that inherits Other's colour.
- Retire `agencies.type` without losing the information it held.

**Non-Goals:**
- No staff tag-management screen; the vocabulary is seeded from code.
- Tags do not drive reporting behaviour (Fire/KBEMS stay class-level concerns).
- No filtering/grouping of the agency list by tag in this change.
- No propagation of tags to class host-agency pickers or student-membership
  views in this change (see Open Questions).

## Decisions

### D1: Two seeded tables, not a text array

Store tags in `agency_tags` and assignments in `agency_tag_links`.

```
agency_tags                          agency_tag_links
  id uuid pk                           agency_id uuid  ─┐ PK(agency_id, tag_id)
  code text unique                     tag_id    uuid  ─┘ → agency_tags.id
  name text not null                   subtype   text null
  isActive bool not null default true
```

*Why over a `text[]` column:* the vocabulary is shared and needs per-tag
metadata (name, colour, active state); a lookup table matches `credential_types`
and keeps "what tags exist" separate from "which agency has which". A array of
codes would duplicate the vocabulary and need app-side validation in every read.

*Alternative considered:* `agencies.tags text[]` + a code constant. Cheaper, but
rejected in the proposal (Option B) because tag identity and colour would live
in two places.

### D2: The six tags are seeded from a code constant

Extend `src/modules/reference/constants.ts` with `AGENCY_TAG_CODES`
(`fire`, `ems`, `law_enforcement`, `other`, `volunteer`, `career`) and seed
rows in `reference-seed.ts` with `onConflictDoUpdate` on `code`, the same shape
as `credential_types` / `reporting_systems`.

*Why not a staff CRUD screen:* the set is small and stable, and the repo's only
seeded vocabularies are also seed-managed. Adding a management screen would be
scope without a driver. Renaming means a seed change + deploy, which is
acceptable for six rows.

### D3: `Other`'s subtype is a constrained value on the link, not a child tag

The link row carries a nullable `subtype` from a fixed code map in
`AGENCY_OTHER_SUBTYPES` (`schools`, `hospital`, `industry`, `business`,
`churches`). A `check` constraint requires `subtype is null or tag_id` resolves
to `other` (enforced in the service layer, since the check cannot see the tag's
code; a partial unique index is not needed because a link is `(agency, tag)`).

*Why not child rows under Other:* the subtype list is fixed in code (user
decision), so making it a first-class tag adds a self-reference and colour
inheritance logic for no reuse benefit. Subtype-as-attribute keeps the badge
rule to one line: colour from the tag, text from `subtype ?? tag.name`.

*Alternative considered:* child tags with `parentId` and null-colour
inheritance. More general, but more machinery than the fixed list justifies.

### D4: Colour is derived from the tag code, not stored

A presentation map in the reference/agency UI resolves a tag code to a badge
colour token (Fire→red, EMS→blue, Law Enforcement→indigo, Other→gray,
Volunteer→green, Career→slate). Add matching `--tag-*` tokens to `globals.css`.
The Other subtype badge resolves its colour from the `other` tag.

*Why not a `color` column:* nothing can change the colour without a code change
(as the vocabulary is seeded), so the map is the single source of truth and
avoids data that could drift from the design system.

*Note:* reusing `--success`/`--destructive` directly was rejected — those carry
meaning elsewhere, so purpose-built neutral-ish `--tag-*` tokens avoid implying
Fire = error.

### D5: Assignment is replace-all within the agency transaction

`createAgency` / `updateAgency` accept `tagIds: string[]` and
`otherSubtype: string | null`. Inside the existing `db.transaction`, the service
validates (tags exist and are active; subtype present only when `other` is among
`tagIds`; subtype in the fixed set), deletes the agency's links, and inserts the
new set. `getAgency` / `listAgencies` join and aggregate tags for display.

*Why replace-all over diffing:* agencies hold at most ~6 links; delete+insert is
simple, correct, and matches the "set semantics" of the form. Diffing is a
premature optimization.

### D6: The form reuses the checkbox-list pattern plus one conditional select

The agency form renders a checkbox list of active tags (existing pattern) and,
when `other` is checked, reveals a subtype `<select>`. Both feed hidden/array
form fields consumed by the existing server actions. This replaces the current
free-text `Type` input.

## Risks / Trade-offs

- **Destructive column drop** → Split into two migrations: the first adds the
  tables and backfills; the drop of `agencies.type` lands in a later migration
  only after the backfill is verified. Keep the legacy value in the audit log.
- **Legacy free-text values don't map cleanly** (e.g. "Fire Dept.") → Backfill
  matches on case-insensitive trimmed equality to a tag name; unmatched values
  default to `other`. Log each fallback for review.
- **Subtype paired with a non-Other tag** → Validate in the service and reject;
  a DB check cannot join the tag code, so the service is the guard.
- **No multi-hue palette exists** → Add explicit `--tag-*` tokens (light + dark
  values) rather than repurposing semantic tokens.
- **Seeded vocabulary can't be edited at runtime** → Accepted; a future change
  can add a management screen if the set grows.
- **Tags only show on agency screens** → An agency shown on a class or student
  screen won't display tags yet. Accepted for this change (see Open Questions).

## Migration Plan

1. Add `agency_tags` + `agency_tag_links` via `db:generate` / `db:migrate`
   (do not drop `type` yet).
2. Extend `reference-seed.ts` so seeding creates the six tag rows idempotently.
3. One-off backfill script: for every agency with a non-null `type`, resolve a
   tag by trimmed, case-insensitive name match; fall back to `other`; insert
   the link. Idempotent (skip agencies that already have links).
4. Verify counts; then a second migration drops `agencies.type`.
5. Rollback: before step 4 the column is intact, so reverting the app code
   restores prior behaviour; after step 4, restore `type` from the audit log /
   a pre-migration backup if needed.

## Open Questions

- Should tags render wherever an agency appears (class host-agency picker,
  student membership lists), or stay on the agency screens for now?
- Should the agency list gain tag filtering once tags exist?
- Exact `--tag-*` colour values for light and dark themes.

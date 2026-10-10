## Why

An agency's `type` is a single, free-text field. It cannot express a combined
department (Fire **and** EMS), a staffing model (Volunteer or Career), or a
non-responder organization without cramming everything into one string, and free
text invites inconsistent spellings of the same label. Staff describe the same
agency type several different ways, so the field is neither reliable for
filtering nor scannable at a glance.

## What Changes

- Replace the free-text `agencies.type` with a controlled tag vocabulary and a
  many-to-many assignment, so one agency can carry several tags.
- Introduce six seeded service/discipline tags: **Fire**, **EMS**,
  **Law Enforcement**, **Other**, **Volunteer**, and **Career**. Fire, EMS, Law
  Enforcement, and Other describe the discipline; Volunteer and Career describe
  the staffing model, and a combined department may hold both.
- Give **Other** an optional fixed subtype — Schools, Hospital, Industry,
  Business, Churches. The badge keeps Other's colour and shows the chosen subtype
  as its text, falling back to "Other" when no subtype is chosen.
- Colour-code tags with badges so an agency's identity is readable in the list,
  the record page, and anywhere an agency appears.
- Collect tags with a multi-select control (not free text) to prevent mistyping
  and label drift.
- **BREAKING**: retire the `agencies.type` column; migrate existing free-text
  values into tags.

## Capabilities

### New Capabilities
<!-- none: tags are a property of agency records and belong to agency management -->

### Modified Capabilities
- `agency-management`: agency records carry one or more coloured service tags
  instead of a single free-text type; the Other tag supports a fixed subtype;
  tag selection replaces free-text entry to prevent mistyping.

## Impact

- **Schema/data**: add `agency_tags` and `agency_tag_links` tables (mirroring
  `credential_types` + `student_agencies`); retire `agencies.type`; migrate
  existing values.
- **Reference seed**: seed the six tags and the fixed Other-subtype list from a
  code constant (`src/modules/reference/constants.ts`, `reference-seed.ts`).
- **Agency module**: create/update service inputs and validation
  (`src/modules/reference/services.ts`); list/read projections include tags.
- **UI**: agency form (`agencies/agency-form.tsx`) gains a tag multi-select and
  the conditional Other subtype dropdown; list
  (`agencies/page.tsx`) and record page (`agencies/[id]/page.tsx`) render
  coloured badges; a resolved tag colour token is added to `globals.css`.
- **Tests**: integration coverage for tag assignment, subtype rendering, and the
  free-text migration.

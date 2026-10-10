## Context

An agency already stores a general contact (name, phone, email) as flat columns on the
`agencies` table, validated by a Zod `agencyInput` in `src/modules/reference/services.ts`
and collected by `agencies/agency-form.tsx`. See proposal.md - Why for the motivation.

Two constraints shape the approach:

- The in-flight `add-agency-tags` change is editing the same form, service input, and
  `agencies` table (and has uncommitted migrations `0029`/`0030`). This change must stack
  on it and apply after it lands.
- The codebase already has a house phone rule: `normalizePhone`
  (`src/modules/reference/masking.ts`) accepts a US 10-digit number and returns `+1XXXXXXXXXX`,
  throwing a plain `Error` otherwise. It is used by students and covered by
  `masking.test.ts`.

## Goals / Non-Goals

**Goals:**
- Capture an optional training coordinator (name, phone, email) per agency, distinct from
  the general contact.
- Validate a supplied coordinator phone as a real US number and a supplied coordinator
  email as a valid email format, with blank values accepted.

**Non-Goals:**
- Validating or changing the existing general agency contact fields.
- Modeling multiple or arbitrary contacts (a general contacts table).
- Changing how or where agency contact details are displayed beyond the existing form and
  record page.

## Decisions

**Store coordinator details as three flat nullable columns.**
`training_coordinator_name`, `training_coordinator_phone`, `training_coordinator_email` on
`agencies`. This matches the existing flat general-contact columns and the change's small
scope.
*Alternatives considered:* a reusable `agency_contacts` table with a role enum — rejected as
out of step with the current flat-column style and more than the requirement needs.

**Validate email in the Zod schema; validate and normalize phone in the service.**
The coordinator email copies the existing optional-email rule
(`z.string().trim().email().max(254).optional().or(z.literal(""))`); format is the only
concern, and the schema already expresses it. The coordinator phone is handled by calling
`normalizePhone` inside `createAgency`/`updateAgency`, matching how students normalize
phones — because `normalizePhone` both validates and produces the stored value, it cannot be
expressed as a pure Zod format check without duplicating the rule.
*Alternatives considered:* a Zod `.refine()` for the phone — rejected because it would
re-implement the digit/format logic and would still not normalize the stored value.

**Guard phone normalization on a non-empty value.**
`normalizePhone` throws on an empty string, so the service SHALL call it only when the
submitted coordinator phone has non-whitespace content. Blank stays blank.

**Accept the phone-format divergence.**
Coordinator phones are stored normalized (`+18595551234`) while the existing general agency
phone is stored as typed. This is deliberate — normalization is the validation mechanism —
and should not be silently "fixed" by normalizing the general phone, which is out of scope.

## Risks / Trade-offs

- [The tags change is uncommitted and edits the same files] → Apply this change after
  `add-agency-tags` is committed; re-read `agencyInput` and the form before editing so the
  coordinator block is added to the tag-aware versions.
- [Stacked migrations] → This migration must be generated after `0029`/`0030` so the
  journal order stays valid.
- [A normalized coordinator phone displays as `+1…` next to a raw general phone] →
  Accepted; documented in Decisions.
- [An invalid coordinator email surfaces a raw Zod error string via the flat form error] →
  Accepted for now; listed under Open Questions.

## Migration Plan

1. Generate a single additive migration adding the three nullable columns after
   `add-agency-tags` migrations.
2. Extend `agencyInput`, `createAgency`, and `updateAgency`.
3. Add the coordinator block to the form, read the fields in the create/update actions, and
   pass the values through the record page.
4. Rollback: the columns are nullable and additive, so reverting the code leaves them
   harmlessly unused; a down migration can drop them.

## Open Questions

- Whether to improve email-validation error messaging (a Zod-error → friendly-message
  helper) so an invalid coordinator email reads better than the current flat raw-message.
  Deferrable; the current behavior is functionally correct and does not change the specs.

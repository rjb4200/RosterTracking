## Why

An agency record carries a single generic contact (name, phone, email), but the person
staff actually coordinate a class with is the agency's **training coordinator**. Today
that role has no dedicated home, so the coordinator's details are either crowded into the
generic contact or tracked outside the system. Staff also enter agency phone numbers and
emails freely, so a wrong number or malformed address is stored without complaint.

## What Changes

- Add a **training coordinator** contact block to the agency record — coordinator name,
  phone number, and email address — as a distinct set of fields alongside the existing
  generic contact.
- Keep all three coordinator fields **optional**; leaving them blank is valid.
- When a coordinator value is supplied, **validate** it:
  - the phone number must be a real, US 10-digit number (normalized to `+1XXXXXXXXXX`
    using the same rule students already use), and
  - the email address must be in a valid email format.
- Collect the coordinator fields on the agency create and edit form and persist them on
  both create and update.

## Capabilities

### New Capabilities
<!-- none: the coordinator is a property of agency records and belongs to agency management -->

### Modified Capabilities
- `agency-management`: agency records may carry a separate training coordinator contact
  (name, phone, email); a supplied coordinator phone must be a valid US number and a
  supplied coordinator email must be a valid email format.

## Impact

- **Schema/data**: add `training_coordinator_name`, `training_coordinator_phone`, and
  `training_coordinator_email` columns to `agencies` (new migration).
- **Agency module**: extend the create/update service input and validation
  (`src/modules/reference/services.ts`); normalize the coordinator phone via
  `normalizePhone` from `src/modules/reference/masking.ts`.
- **UI**: the agency form (`agencies/agency-form.tsx`) gains a training-coordinator
  block; the record page (`agencies/[id]/page.tsx`) passes the values through.
- **Actions**: read the three new form fields in the create and update agency actions
  (`agencies/actions.ts`).
- **Tests**: integration coverage for creating and editing an agency with valid and
  invalid coordinator phone and email.
- **Coordination**: this change stacks on the in-flight `add-agency-tags` change, which
  edits the same form, service input, and schema; apply it after that change lands.

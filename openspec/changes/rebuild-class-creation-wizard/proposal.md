## Why

The class creation page presents every setup field at once despite advertising a four-step flow, forcing instructors into an administrative form and delaying schedule setup until after the draft exists. It also exposes delivery language that does not match Fire roster terminology and does not show the student information implied by reporting selections.

## What Changes

- Replace the single-page class setup form with a responsive, state-preserving four-step wizard for course, site, class details, and reporting, followed by a concise review and one Create Class action.
- Add searchable course and site selection, prioritize recent selections, and allow permitted users to create a site inline without abandoning the wizard.
- Create the draft class and its initial scheduled component together on final submission while retaining the existing class, schedule, access, audit, and permission rules.
- Display the union of required student credentials and fields for selected reporting destinations before creation.
- **BREAKING** Replace persisted delivery values with `classroom`, `hands_on`, `online`, and `hybrid`; migrate historical `in_person` records to `classroom`, `virtual` records to `online`, and retain `hybrid`.

## Capabilities

### New Capabilities

- `class-creation-wizard`: A fast, instructor-oriented guided workflow for creating a scheduled class draft.

### Modified Capabilities

- `class-management`: Change draft creation and delivery-method requirements to support the guided workflow and Fire roster delivery vocabulary.
- `course-catalog`: Make reusable courses and sites searchable and inline-selectable during class creation.
- `reporting-requirements`: Show selected reporting systems' resolved credential and student-field requirements before class creation.

## Impact

- Affects the class creation page, client form state, server actions, class and reference-data services, delivery-method constants and schema constraints, seeded/fixture data, and class displays.
- Requires a database migration that explicitly transforms existing delivery values and updates the delivery-site constraint.
- Requires service, migration, and E2E coverage for wizard navigation, submission, reporting requirement visibility, and migrated delivery values.

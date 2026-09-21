## Why

Regular student sign-in dead-ends at an agency picker that is always empty: agencies created under staff administration are only reachable by guests, students have no membership rows, and nothing in the sign-in workflow can create one. Agencies also lack the contact details the department needs, instructors cannot manage them, and classes have no host agency even though every class must be reported under one.

## What Changes

- Add contact fields to the agency catalog: contact name, phone number, and email address, plus a case-insensitive unique agency name.
- Allow instructors to create and edit agencies, including inline while configuring a class, without any agency deletion.
- Add a required host agency to every class, selected during class creation for all delivery methods.
- Make regular student agency selection default to the class host agency when the student belongs to it, and otherwise fall back to their memberships and then the active catalog.

## Capabilities

### New Capabilities
- `agency-management`: the single agency catalog used by both classes and students, including contact details, name uniqueness, and instructor create/edit access.

### Modified Capabilities
- `students`: memberships become a student's preferred agencies rather than the only agencies they may represent.
- `attendance-sign-in`: the represented agency is resolved from the class host agency and the active catalog, not only from memberships.
- `class-management`: classes require a host agency.
- `class-creation-wizard`: the guided flow collects the host agency before review.

## Impact

- Database: `agencies` (contact columns, unique name), `classes` (required host agency reference) — one additive migration with a backfill step.
- Services: agency create/edit, class creation and open validation, sign-in agency resolution and confirmation.
- UI: staff agency administration, student detail memberships, class creation wizard, manual attendance agency picker, guest agency list.
- Permissions: instructor role gains agency creation and editing; no role is offered agency deletion.
- Data: add "Winchester Fire Department" to the catalog and set it as host for existing classes during rollout.

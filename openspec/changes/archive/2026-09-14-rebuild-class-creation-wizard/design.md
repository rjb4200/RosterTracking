## Context

The existing creation page renders a single client form that immediately submits class references, then sends staff to a separate detail page to add the first session and manage instructors. Course and site data are fetched server-side as simple options, while reporting requirements already exist in versioned tables but are not included in class-form options. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Maintain wizard progress in the browser until final review without persisting incomplete class records.
- Commit the class draft, its first component, reporting destinations, and lead assignment as one server-side unit.
- Preserve existing permission checks, audit events, and class readiness validation.
- Make delivery vocabulary exact and migrate persisted values without relying on runtime compatibility mappings.

**Non-Goals:**
- Support multiple sessions in the initial wizard; staff continue to add additional components from the draft detail page.
- Redesign reference-data administration, student roster entry, or reporting submission.
- Infer whether historical in-person training was Hands-On; the approved migration classifies it as Classroom.

## Decisions

### Client-side wizard state with server-side final validation

Use a client component to manage the active step and form values. Each advance validates its own inputs for immediate feedback; final submission repeats all validation in the server action. This avoids abandoned partial drafts and preserves values while navigating. Persisting after each step was rejected because the requested single Create Class action would otherwise leave incomplete records.

### Atomic creation service

Introduce a service-level operation that creates the class and first component in the same database transaction, then assigns the selected lead instructor and reporting destinations. Reuse the existing draft, component-range, delivery-site, access-token, permission, and audit rules rather than duplicating them in the action. Any validation failure rolls back the entire creation.

### Searchable options are loaded once and filtered locally

Extend the server-loaded form options with course training-code metadata, site metadata, reporting requirements, course defaults, and recent selections for the current actor. The wizard filters the active catalog client-side, which keeps selection responsive and avoids a new search endpoint for the expected catalog size. This choice can be revisited if reference data exceeds the existing 100-result interface limit.

### Inline site creation is a nested wizard action

Place a compact site-creation panel in the site step for users who hold the existing site-management permission. On success, add the returned site to local options and select it without resetting other wizard values. Users without that permission receive only the search and selection controls.

### Explicit delivery-value migration

Replace the current constraint and application constants with `classroom`, `hands_on`, `online`, and `hybrid`. Apply a transactional migration that maps `in_person` to `classroom`, `virtual` to `online`, and preserves `hybrid`, then replaces the delivery and site-required constraints. The old values are removed from application reads and writes after migration.

### Reporting requirements are resolved for the selected destination set

Extend form-option data with active requirement-set mappings and calculate a de-duplicated union when destination selection changes. Render credential type names and student-field labels in the reporting step and review. The server remains the source of truth for roster validation; the wizard display is an early operational cue.

## Risks / Trade-offs

- [A migration could fail if an unexpected delivery value exists] -> Audit distinct values before migration and fail the migration rather than silently classifying an unknown value.
- [A staff user might lose site-management permission during inline creation] -> Authorize the nested server action independently and keep the wizard state intact on rejection.
- [Client-side filtering can become unwieldy with a large catalog] -> Keep option queries bounded and introduce a server-backed search endpoint only when catalog size warrants it.
- [A component save might partially succeed after class creation] -> Keep all draft creation operations in one transaction.

## Migration Plan

1. Add the migration that validates known legacy delivery values, updates `in_person` to `classroom` and `virtual` to `online`, preserves `hybrid`, and replaces constraints.
2. Deploy the application support for the new values, wizard, atomic creation operation, and reporting-requirement read model together.
3. Verify migrated value counts, class creation, delivery/site validation, and staff role behavior in a production-like environment.
4. Roll back application code only before the migration is released. After migration, rollback requires a forward migration to map `classroom` back to `in_person` and `online` back to `virtual`; `hands_on` requires an explicit operator decision because no legacy equivalent exists.

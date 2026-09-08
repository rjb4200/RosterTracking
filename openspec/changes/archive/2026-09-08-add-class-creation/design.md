## Context

Phase 3 supplies students, courses, training sites, reporting systems, and staff authorization. Phase 4 adds the mutable class aggregate that later attendance, reporting, and finalization phases will reference. See proposal.md and the two capability specs for behavioral scope.

## Goals / Non-Goals

**Goals:**
- Model classes as a staff-managed aggregate with catalog references, scheduled components, instructor assignments, reporting selections, and lifecycle state.
- Make draft creation recoverable and validate completeness at the point a class opens.
- Establish the public, token-based class entry boundary needed by student sign-in without exposing student or class data.
- Preserve all mutations through existing audit-log conventions.

**Non-Goals:**
- Student identity lookup, attendance, attestations, manual roster management, reporting submission, finalization snapshots, or official PDFs.
- Persisting raw sign-in tokens or using QR codes as an attendance assertion.
- Supporting non-staff instructors in this slice; instructor assignments reference active staff users.

## Decisions

### Class aggregate with normalized dependents

Use `classes` as the aggregate root with separate `class_components`, `class_instructors`, and `class_reporting_systems` tables. The class references one course and optionally one training site; components carry the session schedule and credited hours.

This keeps multi-session scheduling editable before completion and prevents repeated catalog data. A single wide class table was rejected because it cannot represent multiple sessions or instructor assignments cleanly.

### Delivery and site rules

Store delivery method as a constrained value: `in_person`, `virtual`, or `hybrid`. In-person and hybrid classes require a training site; virtual classes can omit it. The UI uses the same rule to guide the wizard and the domain service enforces it.

This balances an explicit delivery model with the existing reusable site catalog. Free-text delivery descriptions were rejected because later reporting needs stable values.

### Lifecycle and authorization

Store `draft`, `open`, `completed`, `finalized`, and `cancelled` states. Class-management permission allows instructors to create and edit their own drafts and assigned classes; Training Majors and administrators can manage every class. Opening requires complete setup. Completion follows open. Cancellation requires a reason and is prohibited after finalization. `finalized` is modeled now but entered only by the Phase 7 finalization service.

Lifecycle transitions run in domain services and write an audit record in the same transaction. UI guards improve usability but do not authorize mutations.

### Instructor assignments

Class instructors reference active staff users and have an `is_lead` flag with a partial unique index that allows at most one lead per class. Opening requires one lead. Staff users remain separate from student records, preserving the existing identity boundary.

### Reporting-system selections

Class reporting selections join to the existing reporting-system records. New drafts preselect a course's reporting defaults when present, while staff can review the selection before opening. Requirement resolution remains a Phase 5 sign-in concern.

### Sign-in tokens and QR codes

Generate 32 random bytes encoded as a URL-safe token. Persist only a SHA-256 hash with a unique index; the public route hashes its supplied token for lookup. The raw URL and rendered QR code are returned only at create or rotation time. Rotation replaces the stored hash atomically, invalidating the old URL.

Use a QR library that renders SVG or a data URL in the staff UI. The QR code contains only the public sign-in URL. Persisting encrypted raw tokens was rejected because it adds recoverable secret material without a Phase 4 need; staff can rotate access when a new QR is required.

## Risks / Trade-offs

- [A rotated QR link breaks an already displayed code] -> Rotate only through an explicit staff action and show the replacement QR immediately.
- [Course, site, or instructor records may be deactivated after class creation] -> Preserve references and allow existing draft review; reject new selections of inactive records.
- [Local time and time zones can complicate component scheduling] -> Store timezone-aware timestamps and display them using the department's configured timezone; add a configurable timezone only when multi-region requirements exist.
- [The finalized state is present before finalization exists] -> Block direct transitions to it until Phase 7 creates immutable revisions.

## Migration Plan

1. Add the class aggregate tables, lifecycle and delivery checks, foreign keys, indexes, and partial lead-instructor uniqueness constraint in an additive migration.
2. Seed new class-management permissions and grant them to the intended roles.
3. Deploy the schema before the class-management UI and domain services.
4. Roll back application code to the prior compatible version if needed; retain created class records rather than deleting them.

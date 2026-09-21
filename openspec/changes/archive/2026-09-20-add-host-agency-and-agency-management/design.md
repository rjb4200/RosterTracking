## Context

See `proposal.md` — Why. Today `agencies` is a catalog used directly by guest sign-in, `student_agencies` is a membership join used only as a gate for regular sign-in, and `classes` has no agency at all. Contact fields, a uniqueness rule, and instructor agency access are all absent. Twelve students exist with zero memberships, so regular sign-in cannot proceed.

## Goals / Non-Goals

**Goals:**
- One catalog for class host agency and student membership.
- A required host agency on every class.
- Regular students can always complete sign-in regardless of membership data.
- Instructors can create and edit agencies.

**Non-Goals:**
- Agency deletion of any kind.
- Changing credential handling or the reporting-destination model.
- Modeling a distinct state "reporting agency" separate from the host agency.

## Decisions

### D1 — Single catalog, host agency as a foreign key

`classes.host_agency_id` references `agencies.id` with `ON DELETE RESTRICT`; memberships stay in `student_agencies`. No separate class-agency list is introduced. Copying the agency name onto the class was rejected because existing class requirements call for retained catalog references rather than free text.

### D2 — Instructor access reuses `agencies.manage`

Grant `agencies.manage` to the instructor role. Deletion is not implemented anywhere, which satisfies "create and edit but not delete". A dedicated `agencies.create`/`agencies.edit` pair was considered but adds permission surface with no delete operation to exclude today. Deactivation is covered by the same permission; see Risks.

### D3 — Memberships are preferences, not a gate

`requireRegularAgency` relaxes to accept any active catalog agency. Resolution order at sign-in: the class host agency when the student belongs to it; otherwise the student's active memberships plus the active catalog. This removes the dead-end permanently and keeps the catalog the only list anyone maintains.

### D4 — Contact fields and name uniqueness

Add nullable `contact_name`, `phone`, and `email` text columns and a functional unique index on `lower(btrim(name))`. Existing duplicate names must be merged or renamed before the index is created.

### D5 — Migration backfills the required host agency

1. Add `host_agency_id` as nullable.
2. Ensure the department agency exists (create "Winchester Fire Department" if absent).
3. Backfill every existing class with that host agency.
4. Add the foreign key and enforce `NOT NULL`.

Rollback: revert application code; schema rollback drops the new column and index only.

### D6 — Inline add mirrors existing site creation

Reuse the wizard's inline "Add a new site" pattern for agencies, gated by `agencies.manage`, so an instructor can create an agency without leaving class setup.

## Risks / Trade-offs

- [Granting `agencies.manage` to instructors also permits deactivation] → No delete exists; if deactivation must stay elevated, split the permission before rollout.
- [Existing duplicate agency names block the unique index] → Pre-flight query; merge or rename duplicates before migrating.
- [Backfilled host agency may misattribute reporting] → Ship a default, then have staff correct during rollout; current classes are demo/test data.
- [Catalog fallback weakens membership as a control] → Membership remains the default and the basis for host-agency auto-match; recording the represented agency is still required.

## Migration Plan

1. Pre-flight: duplicate agency names, classes lacking a host agency.
2. Additive migration: contact columns, unique name index, nullable `host_agency_id`.
3. Seed or verify Winchester Fire Department.
4. Backfill classes, add the foreign key, enforce `NOT NULL`.
5. Deploy application changes (wizard step, agency admin, sign-in resolution).
6. Rollback: revert application code; drop the new column and index.

## Open Questions

- Whether state reporting will later need a "reporting agency" distinct from the class host agency. Deferrable; the host agency satisfies current scope.

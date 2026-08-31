## Context

The staff authentication and authorization foundation exists, and the application targets one department on Neon PostgreSQL. See `proposal.md` for motivation and the capability specs for requirements. Reference data must be stable and searchable because class creation (Phase 4) and student sign-in (Phase 5) resolve against it.

## Goals / Non-Goals

**Goals:**

- Establish the reference-data schema, migration, and seed as the next vertical slice.
- Introduce a server-only data access layer and server actions for reference-data mutations, with zod validation and audit events.
- Introduce shadcn/ui for the administrative screens ahead of the larger instructor workflows.
- Keep credential values stored but masked in display, with an explicit plaintext decision and revisit trigger.

**Non-Goals:**

- Student sign-in, remembered devices, kiosk PIN, attendance, attestation, classes, finalization, reporting workflow, and roster generation.
- Application-level field encryption (deferred; see Decisions).
- Importing actual Fire Commission training-code rows (no structured source is available yet).

## Decisions

### shadcn/ui for administrative components

Use shadcn/ui for forms, tables, dialogs, and buttons. It is a copy-in component system (no runtime dependency lock-in) and will speed up the CRUD and later instructor/administrative screens. Tailwind CSS is already configured.

Alternatives considered: continuing hand-rolled components avoids setup but slows every later phase; a heavier component library adds a dependency we do not need.

### Encrypted credential storage with masked display

Credential values (FFN, KEMSIS ID, FEMA SID) are encrypted with AES-256-GCM before persistence. A keyed HMAC lookup hash enforces uniqueness within a credential type, while `masked_suffix` supports normal UI display. Full values are excluded from logs and audit details. `CREDENTIAL_ENCRYPTION_KEY` is required in every deployment and must be backed up securely.

This adds defense in depth for database read access. Revisit the approach if regulatory requirements require a managed-key or external key-management integration.

### Unique phone and credential values

Student phone is unique and each credential value is unique within its type. This makes lookup deterministic for sign-in and recovery. People who share a phone number will use the guest sign-in path added in a later phase. The phone number is not embedded in attendance or foreign keys, so relaxing uniqueness later remains a migration rather than a redesign.

### Soft deletion

Reference records use an `is_active` flag and are never hard-deleted. This preserves history consistent with the retention policy.

### Data-driven reporting requirements

Reporting systems, versioned requirement sets, and requirement rows are seeded. A service resolves the union of required credential types and student fields for a set of reporting systems, which student sign-in will consume.

### Server actions and data access layer

Mutations go through `"use server"` actions that call server-only domain services in `src/modules`. Services validate with zod, enforce authorization via `requirePermission`, and write audit events in the same transaction as the change. Search uses case-insensitive `ILIKE` with indexes on the searchable columns; `pg_trgm` is added later only if needed.

### Training-code import deferred

The `training_codes` table and an idempotent import command are built, but no code rows are imported yet because no structured source (CSV) exists. Courses can be created without a training code (`training_code_id` is nullable), so class creation is not blocked.

## Risks / Trade-offs

- [Plaintext credentials are readable by anyone with database read access] -> Masked display, exclusion from logs/audit, least-privilege database credentials, and a documented revisit trigger.
- [Unique phone blocks shared-number students] -> Shared-number students use guest sign-in; uniqueness is not embedded in other tables.
- [shadcn/ui adds surface area] -> Copy-in components are reviewed and pinned; no runtime dependency added.
- [Training codes are empty until imported] -> Table and import command are ready; courses remain usable without a code.
- [ILIKE search can degrade with large tables] -> Start with indexes on searchable columns; introduce `pg_trgm` only when measured.

## Migration Plan

1. Define schema, generate and review the migration, and apply it to the `RosterGenerator` database.
2. Run the reference-data seed (credential types, reporting systems, requirement sets).
3. Apply migrations and seed to production only after review; the migration is additive.
4. Deploy with the new permissions; no data backfill is required.

Rollback of the additive migration before meaningful data exists is safe; after data exists, roll back application code only to a schema-compatible version.

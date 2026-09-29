## Context

See `proposal.md -- Why`. The relevant current state:

- The review screen `src/app/staff/(protected)/classes/[id]/review/page.tsx` renders finalization, a dense per-revision list that embeds `OfficialRosterControls` and `CompletionCertificateControls`, a collapsed corrections block, and attendance in one scroll.
- `audit_logs` (`src/server/db/schema/auth.ts`) is append-only and keyed by `(entity_type, entity_id)`, with a free-form `details` JSONB. There is no `class_id` column. Class-related events are written by `classes/services.ts`, `classes/finalization.ts`, `instructor-roster/services.ts`, `student-sign-in/attendance.ts`, `official-roster-pdfs/service.ts`, and `completion-certificates/service.ts`.
- A from-scratch `pdf-lib` document already exists at `src/modules/class-sign-in-record/pdf.ts` (margins, department time, `wrap()`, page grouping, fixed creation/modification dates).
- PDF delivery routes follow a guard + service + response pattern: `src/app/api/staff/class-sign-in-record/[classId]/route.ts`.
- Roster access logic exists but is not shared: `assertClassRosterAccess` in `class-sign-in-record/service.ts` and `hasElevatedRosterAccess` in `instructor-roster/services.ts`.

## Goals / Non-Goals

**Goals:**
- One source of truth for "what can I view/print from this class" — a Documents section with a single View action per document.
- A detailed class audit log scoped to the class across all lifecycles, delivered as a PDF.
- Keep the change free of new database columns; work with the existing append-only table.

**Non-Goals:**
- Retiring the HTML sign-in-record page at `/staff/classes/[id]/sign-in-record` (still linked from the open-class live roster). The Documents section links View to the PDF so every document behaves identically.
- Building a department-wide audit viewer. Only the class-scoped view is in scope.
- Backfilling `classId` onto historical sign-in student events (database currently holds test data only).
- Changing what the audit system records or sanitizes.

## Decisions

### Decision: Scope the audit log with a query-time union, not a new column

A class audit log is assembled from three predicates against `audit_logs`:

```
entity_type = 'class' AND entity_id = :classId          -- class lifecycle
OR details->>'classId' = :classId                       -- attendance + sign-in events
OR entity_id IN (                                      -- revision outputs
     SELECT id FROM finalization_revisions WHERE class_id = :classId
   )
ORDER BY occurred_at ASC
```

Actor names come from a left join to `users` with a `'System'` fallback for `actor_type = 'system'`.

Alternatives considered:
- **Denormalized `class_id` column on `audit_logs`** — one clean indexed query forever, but requires a migration to an append-only table touched by many writers and a backfill for existing history. Rejected for now because the query-time union handles historical rows immediately and the table is small.
- **Only `entity_type = 'class'`** — simple but omits attendance, sign-in, and every official-output event, which is exactly what the detailed log is for. Rejected.

### Decision: Add the class id to the three sign-in student audit details

`student.profile.completed_from_sign_in`, `student.credential.added_from_sign_in`, and `student.membership.added_from_sign_in` (`student-sign-in/attendance.ts`) currently record no class id, so they cannot be scoped to a class. Add `classId` to each `details` payload. `student.created_from_sign_in` already includes it. No backfill; the database holds test data only.

### Decision: Generate the audit PDF from scratch, mirroring the sign-in record

Reuse the `pdf-lib` approach and helpers of `class-sign-in-record/pdf.ts` rather than the official-form template machinery (`official-roster-pdfs`), which is built for filling specific forms. The document carries fixed creation/modification dates and `Roster Command` metadata for reproducibility, matching the existing record.

### Decision: Render actions through a server-side label map with phase grouping

A single server-side map converts each known action code into a category (setup, sign-in & attendance, finalization, reporting & outputs) and a human-readable description rendered from its `details`. Unknown actions render a generic entry rather than failing the document. This keeps the PDF stable and testable and isolates future event types.

### Decision: Offer one View action per document and retire separate print/download

Every document is opened inline (`?disposition=inline`) and the browser PDF viewer provides print and download. `OfficialRosterControls` reduces to one View plus the existing email control; certificate and sign-in-record actions reduce to one View each. This matches the existing spec statement that roster delivery methods share one rendered document.

### Decision: Documents section targets the latest revision and gates official outputs on finalization

The Documents section resolves the latest revision by highest `revision_number`. Rosters and certificates are shown only when a finalized revision exists; when the class is completed but not finalized, the section states that finalization is required. The sign-in record and audit log are shown regardless, since both are available for completed classes. Older revisions keep their outputs inside the revision history section.

### Decision: Share the roster access assertion

The audit log uses the roster access rule. Extract the existing `assertClassRosterAccess` logic (elevated role via `hasElevatedRosterAccess`, otherwise assigned instructor via `class_instructors`) into a shared helper used by the sign-in record and audit services, rather than duplicating it.

## Risks / Trade-offs

- `details->>'classId'` is not indexed → acceptable at current volume; add an expression or GIN index, or a `class_id` column, when the table grows. Tracked as a future item, not part of this change.
- Historical sign-in student events lack `classId` → they will not appear in older classes' logs. Accepted; test data only.
- The audit PDF must paginate and wrap long detail strings → reuse the sign-in record's page-grouping and `wrap()` logic and cap rendered detail length.
- A new event type without a label entry → generic fallback entry, so the document never fails.
- Consolidating to one View is a visible behavior change for staff used to the separate buttons → the inline viewer already exposes print/download, and the official-roster spec is updated to match.

## Migration Plan

1. Add `classId` to the three sign-in audit detail payloads (no schema or data migration).
2. Ship the new audit module, route, shared access helper, and the reorganized review screen in one deploy.
3. Rollback: revert the deploy; the added audit detail keys are harmless if left in place.

## Open Questions

- Whether to add an index or `class_id` column for the audit query. Deferrable until audit volume grows; does not change specs or task breakdown.

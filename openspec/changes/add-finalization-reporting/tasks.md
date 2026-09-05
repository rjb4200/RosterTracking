## 1. Revision schema and policy

- [x] 1.1 Add additive finalization revision, protected snapshot, reporting-destination status, and reopen metadata schema with immutable and unique revision constraints.
- [x] 1.2 Generate, review, and apply the Phase 7 migration without changing existing class, attendance, attestation, or roster records.
- [x] 1.3 Add assigned-instructor finalization and reopen authorization plus Training Major/Administrator reporting permissions and server-side destination-update policies.
- [x] 1.4 Add pure validation for roster readiness, finalization transitions, reopen reasons, and independent reporting status transitions.

## 2. Finalization services

- [x] 2.1 Build one locked finalization transaction that revalidates a completed class, snapshots class/instructor/attendance/agency/credit/attestation/reporting facts, creates the next immutable revision, initializes reporting destinations, changes class state, and writes audit events.
- [x] 2.2 Add authorized reopen that requires a reason, preserves all revisions, returns the class to a correction state, and writes an audit event.
- [x] 2.3 Extend class and roster mutations to reject normal edits while finalized and permit re-finalization only as a later revision.
- [x] 2.4 Add reporting-destination updates that retain actor, timestamp, reference number, notes, and correction state without altering other destinations.
- [x] 2.5 Add finalization revision history and pending/needs-correction queue query models that avoid exposing protected snapshot values.

## 3. Staff workflows

- [x] 3.1 Add finalization and authorized reopen controls to the staff class detail workflow with clear validation and reason feedback.
- [x] 3.2 Add revision-history views with class-level revision facts and destination status summaries.
- [x] 3.3 Add pending and needs-correction reporting queue views and destination-specific update controls.
- [x] 3.4 Ensure finalization, reopen, and reporting interactions remain accessible and usable on tablet and desktop viewports.

## 4. Tests and documentation

- [x] 4.1 Add unit tests for finalization validation, revision numbering, lock behavior, reopen reasons, and independent reporting transitions.
- [x] 4.2 Add integration tests for migration, immutable snapshots, re-finalization lineage, finalized edit denial, reporting audit facts, and queue results.
- [x] 4.3 Add Playwright coverage for finalization, reopen, revision history, reporting queues, and destination-specific corrections.
- [x] 4.4 Update architecture and roadmap documentation with finalization immutability, reopen lineage, reporting status ownership, and queue semantics.
- [x] 4.5 Run lint, typecheck, unit/integration/E2E tests, migration checks, production build, and strict OpenSpec validation; resolve all failures.

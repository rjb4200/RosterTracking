## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- The wizard is a fixed three-step array (`Class`, `Reporting`, `Review`) with a numeric index in `class-creation-wizard.tsx`. Reporting is a multi-select checkbox list rendered on step 2.
- `class_reporting_systems` is a join table, so a class can already report to several systems at once.
- Reporting systems are seeded as Fire, KBEMS, and FEMA (`reference-seed.ts`); FEMA SID is a seeded credential type.
- `finalization_reporting_statuses` stores one independent status per revision per system, and the reporting queue already lists destinations generically.
- `FinalizationSnapshot` (`official-roster-pdfs/service.ts`) already has an optional `components` array added for older-revision compatibility — the same pattern fits an optional MTU usage block.

## Goals / Non-Goals

**Goals:**
- Choose destinations before the fields that depend on them.
- Let a destination's step appear only when it is selected.
- Remove FEMA cleanly without breaking existing revisions.
- Capture MTU usage and carry it into the immutable revision.

**Non-Goals:**
- Not generating an MTU report — usage is stored for a later change.
- Not building the equipment/supplies dropdowns — MTU fields are free text for now.
- Not defining the Fire subject fields (that is `complete-fire-roster-fields`) or the certificate fields (that is `add-ems-completion-certificate`).
- Not changing finalization authority or roster rendering.

## Decisions

### D1 — Destinations step first; steps are computed, not fixed
The wizard derives its step list from state: `Destinations` → one step per selected destination (Fire, KBEMS, MTU, in a stable order) → `Class & schedule` → `Review`. Adding or clearing a destination recomputes the list.

- **Why**: the destination determines which fields matter, so asking it first removes the "ask for everything, use some of it" problem.
- **Alternatives**: keep Reporting last and reveal fields inline (rejected — the spec requires guided steps); one mega-step per destination including class fields (rejected — duplicates class fields across branches).
- Retained values for a cleared destination are dropped from submission but kept in component state so re-selecting does not lose typing.

### D2 — MTU is a destination, not a reporting body
MTU is stored as a `reporting_systems` row so it is selectable and gets an independent finalization status, but its requirement set is empty (no student credential) and its usage lives in a dedicated table.

- **Why**: reuses the existing destination machinery (selection, status, queue) without pretending MTU is a regulator.
- **Alternatives**: a separate `mtu` boolean on the class (loses the queue/status model); a hard-coded MTU step (breaks the data-driven destination rule).

### D3 — MTU usage in its own table, keyed to the class
`mtu_usage` holds `classId` plus `equipment_used`, `mileage`, and `used_supplies` as free text.

- **Why**: usage is one row per class; free text matches the stated "for now" intent and keeps the schema stable when dropdowns arrive.
- **Alternatives**: JSON on the class (harder to report on later); separate rows per equipment item (premature before the multiselect design exists).

### D4 — FEMA is deactivated, not deleted
Seed changes set the FEMA system `isActive = false` (and the FEMA SID credential type) rather than deleting rows, because existing `finalization_reporting_statuses` rows reference the FEMA system.

- **Why**: deleting would violate the `onDelete: restrict` reference and erase reporting history.
- **Alternatives**: delete with cascade (destroys history); leave FEMA active (contradicts the requirement).

### D5 — Preserve MTU usage in the revision snapshot
Extend `FinalizationSnapshot` with an optional `mtuUsage` block and write it at finalization.

- **Why**: matches the existing immutable-revision contract and lets the future report read finalized facts rather than mutable rows.
- **Alternatives**: read `mtu_usage` live when reporting (breaks the "official output uses revision facts" rule).

## Risks / Trade-offs

- **A long workflow when many destinations are selected** → destinations are mutually optional, so most classes show one destination step; step order is fixed and review summarizes everything.
- **Cleared destination data still in memory** → dropped from the submitted payload; a test asserts cleared MTU/KBEMS values are not persisted.
- **FEMA still referenced by old revisions** → deactivation keeps the row and its history readable; the queue simply stops offering FEMA for new work.
- **Existing classes have no MTU usage** → `mtuUsage` is optional in the snapshot, mirroring the `components` compatibility pattern.
- **`components`-style optional fields drift** → keep the snapshot type and its readers in one module and cover the missing-field case in tests.

## Migration Plan

1. Seed change: deactivate FEMA, add MTU, add the empty MTU requirement set. No class rows change.
2. Add the `mtu_usage` table and wire capture through the wizard and class edit path.
3. Extend the finalization snapshot and its readers; keep `mtuUsage` optional.
4. Update the wizard to the destinations-first computed steps.
5. **Rollback**: revert the commit; the FEMA deactivation is reversible by re-activating the row, and `mtu_usage` can be dropped without affecting revisions written before it.

## Open Questions

None blocking. The MTU report and dropdowns are explicitly deferred to a later change.

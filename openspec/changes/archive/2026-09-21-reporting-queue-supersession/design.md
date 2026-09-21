## Context

See `proposal.md` - Why. The constraints that shape the approach:

- `finalizeClass` inserts one `finalization_reporting_statuses` row per destination per revision, defaulting to `pending` (`finalization.ts:316-322`).
- `reopenFinalizedClass` retains prior revisions and permits a higher-numbered revision on the next finalization (`finalization.ts:344`).
- `listReportingQueue` (`finalization.ts:576`) selects per-revision rows joined to revisions and classes, filtering by destination, date range, and status — defaulting to `pending` and `needs_correction` — with no awareness of other revisions of the same class.
- `finalizationRevisions` already carries `revisionNumber` per class, so the prior revision is derivable without a schema change.
- The queue screen at `/staff/reporting` already renders per-item actions: mark entered, mark not required, and a supported roster download.

## Goals / Non-Goals

**Goals:**
- A Training Major can tell revised work from first-time work.
- The already-reported history for the same class and destination is visible from the queue item.
- What finalization writes stays exactly as it is.

**Non-Goals:**
- Carrying a destination's status forward across a revision.
- Blocking or warning against re-finalization itself.
- Changing revision immutability or the reopen rules.

## Decisions

**Signal supersession; do not suppress the new work.**
A new revision's destinations must be re-reported because the roster changed, so the item stays `pending`. Only its identity changes — it is revised work, not new work. *Alternative considered:* carry the prior `entered` status forward — rejected because it would mark a changed roster as already reported, which is the opposite error and worse.

**Derive supersession in the query rather than storing it.**
The superseded revision is the highest `revisionNumber` below the current one for the same class — already in the data. *Alternative considered:* a stored `supersedes_revision_id` column — rejected as a new column and migration for a fact that is derivable, and one that could drift out of step with the revisions it points at.

**Show the prior revision's status for the same destination, not a generic flag.**
"Revised" alone does not tell a Major whether the class was already sent. "Supersedes revision 1 — Fire: entered" does. *Alternative considered:* a boolean badge — rejected as insufficient to prevent the duplicate submission it exists to prevent.

**Keep the superseded revision reachable.**
The filed defect notes there is no link back to the prior revision, so the item links to it and to the statuses recorded on it.

## Risks / Trade-offs

- **The prior-revision lookup adds a per-row correlated subquery.** → It runs over a queue already bounded by status and date filters, against an indexed class-to-revision relationship.
- **A class can be reopened more than once.** → The marker names the immediately preceding revision, which is the one that matters for a duplicate-submission decision; the full lineage remains visible in revision history.
- **The queue's default filter excludes `entered` work.** → The superseded revision's status is rendered on the item even when that status is outside the active filter, so the signal does not disappear exactly when it is needed.

## Migration Plan

No schema change and no migration. The change is additive to the queue result shape and the queue screen. Rollback reverts the commit; revisions and their statuses are untouched either way.

## Open Questions

- Whether the queue should also offer the superseded revision's official roster PDF for side-by-side comparison. Useful, but not required to close the duplicate-reporting risk, and it does not change the specs or the approach.

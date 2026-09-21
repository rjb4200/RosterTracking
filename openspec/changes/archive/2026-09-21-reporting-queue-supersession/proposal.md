## Why

Reopening a finalized class, editing it, and re-finalizing it creates a new revision whose reporting destinations are inserted as fresh `pending` rows. In the Training Major reporting queue that work is indistinguishable from a class being reported for the first time, so a Major can submit the same class to an agency twice without noticing. This is filed as defect #12 and is the one high-severity finding of the Phase 9 hardening review that is not yet resolved.

## What Changes

- Queue items whose class has an earlier finalization revision are marked as **revised work**, showing the revision they supersede and that revision's status for the same destination.
- First-time finalizations are explicitly *not* marked as superseding, so the distinction is meaningful in both directions.
- The prior revision remains reachable from the queue item, so a Major can see what was already reported.
- No change to what re-finalization writes: a new revision's destinations still start as `pending`, because the roster changed and the agency report genuinely has to be regenerated. The defect is the missing signal, not the reset.

## Capabilities

### New Capabilities
<!-- None: this extends the existing reporting queue. -->

### Modified Capabilities
- `finalization-reporting`: the reporting work queue distinguishes revised work from first-time work and identifies the revision a queue item supersedes.

## Impact

- **Queue query**: `listReportingQueue` (`src/modules/classes/finalization.ts:576`) gains a per-class prior-revision lookup; its result shape carries the superseded revision number and that revision's status for the same destination.
- **Queue screen**: the reporting route renders the revised-work marker and the link to the prior revision.
- **Unchanged**: `finalizeClass` still inserts `pending` rows per destination per revision, and the immutable revision and reopen behavior are untouched.
- **No schema change** and no migration; the relationship is derivable from existing revision rows.
- **Out of scope**: whether an already-reported destination should stay `entered` across a revision. It should not — the roster changed, so the report must be regenerated. This change only makes that fact visible.
- **Related**: this was finding H-2 of `phase-9-production-hardening`, split out so the hardening epic's high-severity triage is not blocked by a feature change.

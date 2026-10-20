## Why

`add-assistant-instructors` lets an assisting fire instructor sign the Fire roster, but it records that signature as a Fire-specific exception beside the existing single-signature revision. The certificate, review screen, class list, and reminders still assume one signature per finalization, so staff cannot tell which document is signed, which is pending, or which reporting destination is blocked. This change makes each required attestation a first-class, scope-keyed fact and gates documents, delivery, and reporting on it.

## What Changes

- **BREAKING** for the revision model: a finalization revision holds zero or more attestations keyed by document scope (`roster`, `fire`) rather than one signer. Existing revisions with one signature are read as a `roster` attestation that also covers `fire` when that revision required it.
- The class lead's finalization certification is the `roster` attestation and the completion certificate's signature.
- The fire-eligible instructor's attestation is the `fire` attestation and the signature on the KFS-1A and individual training notice.
- A document is generated only when its scope is attested. The certificate waits for `roster`; the Fire roster and notice wait for `fire`. New revisions never render a blank instructor signature.
- The review screen and revision history show per-scope attestation status: signed by whom and when, or awaiting whom.
- The class list shows a pending-signature indicator beside the lifecycle status, and the responsible signer gets a daily reminder while a `fire` attestation is pending.
- A scope's reporting destination cannot move to `entered` until that scope is attested.
- Reopening a finalized class voids pending attestations and requires fresh attestations on the new revision.

## Capabilities

### New Capabilities

<!-- None: this change generalizes the attestation model owned by existing capabilities. -->

### Modified Capabilities

- `finalization-reporting`: revisions carry scope-keyed attestations; the roster snapshot is immutable while attestations append; per-scope reporting gates; reopening voids pending attestations.
- `roster-signing`: defines the `roster` and `fire` scopes, who attests each, and the rule that a document is not generated until its scope is attested.
- `completion-certificates`: the certificate requires the `roster` attestation and no longer renders a blank signature for a new revision.
- `guided-roster-finalization`: the review screen shows per-scope status and offers the remaining signer a sign action without reopening the roster.
- `operational-class-dashboards`: the dashboard lists classes awaiting the operator's finalize or sign action per scope.
- `class-management`: the class list flags a finalized class whose required attestation is still pending.
- `class-finalization-reminders`: overdue finalization reminders go to the lead; pending `fire` attestations are reminded to the Fire signer.
- `class-audit-log`: scope attestations are recorded as signing events.

## Impact

- **Data**: generalize the `add-assistant-instructors` Fire attestation into a `revision_attestations` table keyed by `(revision_id, scope)`. The existing `signed_by_user_id`, `signed_by_name`, `signed_at`, and `attestation_version` columns remain as the legacy `roster` attestation and are dual-read. No destructive backfill.
- **Services**: finalization creates the `roster` attestation; signing appends a `fire` attestation; attestation resolution is shared by finalization access, document rendering, reporting, dashboards, and reminders.
- **UI**: review screen per-scope status and sign action; class list indicator; dashboard pending-action list; reminder digest content.
- **Rendering**: the completion certificate requires `roster`; the KFS-1A and notice require `fire`. New revisions do not render blank signatures; legacy revisions without an attestation keep the documented fallback.
- **Compatibility**: existing finalized revisions remain readable and keep their current outputs. Reopened legacy revisions require fresh attestations under the new model.

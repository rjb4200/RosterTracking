## Context

`add-assistant-instructors` introduces a Fire attestation so an assisting fire instructor can sign the Fire roster. It keeps the existing single-signature revision columns for the lead and records the Fire signature in a separate `finalization_fire_attestations` table. That works for the Fire paperwork but leaves the rest of the system assuming one signature per finalization:

- `finalization_revisions` stores the lead's `signed_by_user_id`, `signed_by_name`, `signed_at`, and `attestation_version`; `finalization_fire_attestations` stores the Fire signer separately.
- The certificate, review screen, class list, and reminders do not distinguish a roster signature from a Fire signature.
- A Fire signature can arrive after the revision is created, so "signed" is no longer a single boolean.

This change makes attestations first-class and scope-keyed. It assumes `add-assistant-instructors` has landed: one lead, zero or one assistant, the fire-eligible predicate, and the Fire signer resolver already exist.

## Goals / Non-Goals

**Goals:**
- Record one attestation per required document scope (`roster`, `fire`) on a revision.
- Gate document generation, delivery, and reporting on the relevant scope.
- Show per-scope status to operators and the responsible signer.
- Keep existing revisions readable without a destructive backfill.
- Preserve the lead-only finalization rule.

**Non-Goals:**
- Changing the 1+1 assignment model or the Fire guard.
- Adding more document scopes than `roster` and `fire`.
- A second finalization lifecycle state or a multi-step approval workflow.
- Re-signing or invalidating historical revisions.

## Decisions

**One attestation row per `(revision, scope)`.**
Add `revision_attestations` with `revision_id`, `scope` (`roster` or `fire`), `signed_by_user_id`, `signed_by_name`, `signed_at`, and `attestation_version`, keyed by `(revision_id, scope)`. A single action that satisfies both scopes writes two rows with the same timestamp and typed name. A scope row is immutable once written. The table generalizes both the legacy `signed_by_*` roster signature and the Change 1 `finalization_fire_attestations` Fire row. *Alternative considered:* one row with `scope` array or two nullable column sets on the revision. Rejected because gating queries and future scopes are cleaner with rows.

**The lead creates the `roster` attestation at finalization.**
The lead's existing finalization certification becomes the `roster` attestation. It certifies the roster and is the completion certificate's signature. If the lead is the Fire signer, the same action also creates the `fire` attestation. If the lead is not the Fire signer, the `fire` attestation is created later by the assistant. *Alternative considered:* a separate `kbems` scope. Rejected because the lead's roster certification is meaningful for every finalization, including Fire-only classes, and the certificate simply consumes it when KBEMS is a destination.

**The `fire` attestation is append-only against the locked revision.**
The Fire signer reviews the finalized, locked roster and signs. The revision snapshot never changes; a `revision_attestations` row keyed by `(revision, fire)` records the signature. The Fire roster and individual training notice are generated only when `fire` exists. *Alternative considered:* require the Fire signature before the roster locks. Rejected because it would need a draft-snapshot state and would let the Fire signer block the lead's finalization. The chosen order matches the paper process: the lead completes and locks the roster, then the fire instructor signs the Fire paperwork.

**Generation is gated, not blanked.**
The renderer and the UI require the scope. The certificate requires `roster`; the KFS-1A and notice require `fire`. New revisions never render a blank instructor signature. Legacy revisions with no attestation keep the documented blank-signature fallback so old output remains reproducible. *Alternative considered:* generate with a blank signature line. Rejected by the department rule that a certificate cannot generate until signed by an instructor and a Fire roster cannot generate until signed by a fire instructor.

**Reporting follows the same scopes.**
A destination's status cannot move to `entered` until its scope is attested: Fire requires `fire`, KBEMS requires `roster`. MTU has no scope. The queue shows the pending signature as the blocker. *Alternative considered:* allow entry and track signatures separately. Rejected because it permits reporting a document that does not yet exist.

**Visibility is per scope.**
The class list flags a finalized class with a pending required attestation. The dashboard lists the operator's finalize or sign action with the document name. The daily reminder includes pending `fire` signatures for the Fire signer; overdue finalization remains with the lead. *Alternative considered:* a single "needs attention" flag. Rejected because the lead and the Fire signer need different actions.

**Reopening voids pending attestations.**
Reopening supersedes the revision and any pending `fire` attestation. The lead must re-finalize, creating a new `roster` attestation, and the Fire signer must sign the new revision. Existing attestations stay with the superseded revision as history. *Alternative considered:* carry a pending signature to the new revision. Rejected because the roster facts may have changed.

**Legacy revisions dual-read.**
If a revision has no `revision_attestations` rows, read the legacy `signed_by_*` columns as the `roster` attestation and the Change 1 `finalization_fire_attestations` row as the `fire` attestation. A revision that predates Change 1 had one signer for every document, so its legacy signature covers both scopes when the revision required Fire. New writes always use `revision_attestations`. The migration backfills materialized rows from both sources; the app keeps the dual-read until the backfill is confirmed.

**One resolver, shared.**
`requiredAttestations(class, instructors)` returns the scopes and their signers; `signerForScope(revision, scope)` returns the stored signer. Finalization access, document generation, reporting, dashboards, and reminders all use these, so they cannot disagree. The Fire signer resolver from `add-assistant-instructors` remains the source for the `fire` scope.

## Risks / Trade-offs

- **[A pending Fire signature can sit forever]** → The class list flags it, the dashboard lists it, and the reminder repeats daily. An Administrator reopens and reassigns when the signer is unavailable.
- **[Reporting is blocked by a missing signature]** → Show the pending signature as the blocker with a link to the sign action, not a generic error.
- **[Legacy revisions may not match the new scope model]** → Dual-read the legacy signature; do not retroactively invalidate or require a new signature for historical revisions.
- **[Two changes modify the same requirements]** → `add-assistant-instructors` is archived; this change is rebased onto the resulting specs and applies its deltas in order.
- **[Users expect a reopened class to keep signatures]** → State that reopening voids pending attestations and requires fresh ones; keep old attestations visible on the superseded revision.
- **[An inactive Fire signer blocks the Fire roster]** → The pending state is visible; an Administrator reopens and reassigns. Signing itself requires authentication, so an inactive account cannot sign.

## Migration Plan

1. Apply `add-assistant-instructors` and archive it so the main specs contain the 1+1 rule, the Fire guard, and the Fire signer.
2. Add `revision_attestations`; keep the legacy `signed_by_*` columns and the `finalization_fire_attestations` table for compatibility.
3. Backfill `revision_attestations` from `finalization_fire_attestations` and the legacy `signed_by_*` columns. For revisions that predate Change 1, the legacy signature covers `roster` and, when the revision required Fire, `fire`.
4. Dual-read until the backfill is confirmed: new writes use `revision_attestations`; old rows fall back to the legacy sources.
5. Deploy the gating and visibility changes.
6. Optionally drop `finalization_fire_attestations` in a later cleanup change.
7. Rollback: drop `revision_attestations` and revert to the legacy paths. Existing revisions are unaffected because the legacy columns and table remain.

## Open Questions

- Should the `roster` scope be named `kbems` in the data model, or is it broader than the KBEMS certificate? (`roster` is chosen because it applies to Fire-only finalizations too.)
- Should a pending `fire` attestation block the completion certificate batch? (Assumed no: the certificate uses `roster`, which the lead signed.)
- Can an Administrator sign a pending scope on another instructor's behalf? (Assumed no; reassign and re-finalize.)

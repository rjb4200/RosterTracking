## 1. Data model and migration

- [x] 1.1 Add a `revision_attestations` table keyed by `(revision_id, scope)` with `signed_by_user_id`, `signed_by_name`, `signed_at`, and `attestation_version`; constrain `scope` to `roster` and `fire`
- [x] 1.2 Keep the existing `finalization_revisions.signed_by_*` columns as the legacy `roster` attestation and document the dual-read rule
- [x] 1.3 Add a forward-only migration for the new table and a query that audits legacy revisions lacking a materialized attestation
- [x] 1.4 Backfill `revision_attestations` from the legacy `signed_by_*` columns (`roster`, plus `fire` where the revision required it) and from the Change 1 `finalization_fire_attestations` table

## 2. Attestation domain and services

- [x] 2.1 Add `requiredAttestations(class, instructors)` returning the required scopes and their resolved signers, and `signerForScope(revision, scope)`
- [x] 2.2 Create the `roster` attestation in the finalization transaction from the lead's certification and typed name
- [x] 2.3 Create the `fire` attestation at finalization when the lead is the Fire signer, or append it later when the assistant is the Fire signer
- [x] 2.4 Refuse duplicate scope attestations, refuse a signer who is not the scope's resolved signer, and refuse edits to an attested scope
- [x] 2.5 Void pending attestations when a finalized class is reopened, and require fresh attestations on re-finalization
- [x] 2.6 Write an audit event for each scope attestation and for a pending attestation voided by reopen

## 3. Document generation gates

- [x] 3.1 Require the `roster` attestation before generating the completion certificate; keep the legacy blank-signature fallback for revisions that predate attestations
- [x] 3.2 Require the `fire` attestation before generating the KFS-1A and individual training notice
- [x] 3.3 Remove blank-signature generation for new revisions and make the API reject a document request whose scope is unattested
- [x] 3.4 Use `signerForScope` for the certificate, KFS-1A, and notice signatures rather than resolving from current instructor profiles

## 4. Reporting and delivery gates

- [x] 4.1 Refuse to mark Fire entered until the `fire` attestation exists
- [x] 4.2 Refuse to mark KBEMS entered until the `roster` attestation exists; leave MTU unblocked
- [x] 4.3 Show the pending attestation as the reporting blocker with the sign action
- [x] 4.4 Gate the Fire notice email on the `fire` attestation and the certificate batch delivery on the `roster` attestation

## 5. Review screen and dashboards

- [x] 5.1 Show each required scope's status on the review screen: signed by whom and when, or awaiting whom
- [x] 5.2 Offer the sign action only to the pending scope's signer; keep the roster read-only while signing
- [x] 5.3 Show per-scope attestation status in the revision history
- [x] 5.4 List pending finalize and sign actions on the operator's dashboard, naming the class and the document scope
- [x] 5.5 Show a pending-signature indicator beside the class list status without replacing the lifecycle state

## 6. Reminders and audit

- [x] 6.1 Send overdue-finalization reminders to the class lead and pending `fire` reminders to the Fire signer
- [x] 6.2 Stop signature reminders after signing or reopening; resume only after a new finalization makes a scope pending
- [x] 6.3 Include the scope, signer, revision, and timestamp in each attestation audit event
- [x] 6.4 Ensure document view, print, download, and email do not duplicate the attestation audit event

## 7. Tests

- [x] 7.1 Unit-test `requiredAttestations` and `signerForScope` for KBEMS-only, Fire-only, both scopes, and the same-person case
- [x] 7.2 Integration-test finalizing as the lead with both scopes and with only the roster scope
- [x] 7.3 Integration-test the assistant signing `fire` after finalization and the Fire documents becoming available
- [x] 7.4 Integration-test the reporting gates for Fire, KBEMS, and MTU
- [x] 7.5 Integration-test reopening with a pending attestation and confirming the new revision requires fresh attestations
- [x] 7.6 Integration-test legacy revision dual-read and the blank-signature fallback
- [x] 7.7 End-to-end test the EMS-led Fire+KBEMS class through certificate generation, Fire signature, and Fire document generation

## 8. Verification

- [x] 8.1 Run `npm run check` and `npm run verify` and resolve any failures
- [x] 8.2 Confirm `openspec validate add-per-document-signing` passes
- [x] 8.3 Confirm the change is archived after `add-assistant-instructors` so the deltas apply in order

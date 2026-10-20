## ADDED Requirements

### Requirement: Scope attestations are audited

The system SHALL record an audit event for each document-scope attestation, identifying the class, the revision number, the scope, the signer, the server timestamp, and the action. The system SHALL NOT record a duplicate attestation event when an operator views, prints, downloads, or emails an already attested document. Voiding a pending attestation by reopening a class SHALL be recorded as a lifecycle event on the superseded revision.

#### Scenario: Record a roster attestation
- **WHEN** the class lead finalizes a class and creates the `roster` attestation
- **THEN** the audit log records the revision, the `roster` scope, the lead as signer, and the server timestamp

#### Scenario: Record a Fire attestation
- **WHEN** the Fire signer records the `fire` attestation on a finalized revision
- **THEN** the audit log records the revision, the `fire` scope, the Fire signer, and the server timestamp

#### Scenario: Do not duplicate on document access
- **WHEN** an operator views or downloads an already attested document
- **THEN** the audit log does not add another attestation event

#### Scenario: Record a pending attestation voided by reopen
- **WHEN** an Administrator reopens a finalized class with a pending attestation
- **THEN** the audit log records the reopen and that the pending attestation was voided

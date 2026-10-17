## ADDED Requirements

### Requirement: Finalization reconciles reporting context before locking
Before it reports readiness or validates the roster for an open class, the system SHALL reconcile every active attendance's reporting context with the class's currently resolved reporting requirement sets, so a destination changed after attendance was recorded neither withholds the finalize action nor blocks finalization. A class whose selected reporting systems changed after sign-in SHALL present as ready, finalize successfully, and — when a certificate-bearing reporting system is among its destinations — queue a completion certificate for every active participant with a deliverable email. A context that cannot be derived from the class's selected reporting systems SHALL still be reported as missing and SHALL withhold finalization.

#### Scenario: Review a class whose destinations changed after sign-in
- **WHEN** an authorized operator opens the review screen for an open class whose selected reporting systems changed after attendance was recorded and no save has reconciled the contexts
- **THEN** the system reconciles each active attendance's reporting context and presents the roster as ready to finalize

#### Scenario: Finalize a class whose destinations changed after sign-in
- **WHEN** the lead instructor finalizes a class whose selected reporting systems changed after attendance was recorded
- **THEN** the system reconciles each active attendance's reporting context before validation, finalization succeeds, and the revision is created

#### Scenario: Issue certificates after a destination-driven finalization
- **WHEN** a reopened class is re-finalized with a certificate-bearing reporting system selected among its destinations
- **THEN** the system queues a completion certificate for every active participant with a deliverable email

#### Scenario: Leave a genuinely missing context unresolved
- **WHEN** an active attendance lacks a reporting context that cannot be derived from the class's selected reporting systems
- **THEN** the system still identifies that record and withholds finalization

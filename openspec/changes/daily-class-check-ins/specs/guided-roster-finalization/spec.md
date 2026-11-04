## ADDED Requirements

### Requirement: Missing-day dispositions block finalization

For an initial-certification program class, the review workspace SHALL identify each active student missing one or more class days and SHALL block finalization until every flagged student has a certificate-inclusion note or a certificate-exclusion reason. The disposition SHALL record its actor and timestamp.

#### Scenario: Show the unresolved students

- **WHEN** three active students have missing days and no dispositions
- **THEN** the review workspace identifies all three and blocks finalization

#### Scenario: Resolve with an inclusion note

- **WHEN** the operator chooses Include certificate and enters a note
- **THEN** the student is resolved and remains eligible for a certificate

#### Scenario: Resolve with an exclusion reason

- **WHEN** the operator chooses Exclude certificate and enters a reason
- **THEN** the student is resolved and remains on the roster and transcript without a certificate

#### Scenario: Persist the resolver

- **WHEN** a disposition is saved
- **THEN** the system records the resolving actor and timestamp

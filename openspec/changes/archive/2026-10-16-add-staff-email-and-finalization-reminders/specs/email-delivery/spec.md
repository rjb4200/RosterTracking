## MODIFIED Requirements

### Requirement: Outbound email is queued durably and dispatched outside the originating transaction

The system SHALL record an outbound email as a durable delivery record before attempting to send it, and SHALL attempt delivery only after the transaction that requested it has committed. A delivery SHALL be keyed to its message template, its source, and its recipient, and SHALL carry a status of `queued`, `sent`, `failed`, or `skipped`. A delivery SHALL also represent a scheduled message addressed to a staff account for a period, keyed by its template, that account, and that period, so a repeat run for the same account and period does not send a second message. The originating operation SHALL NOT fail or roll back because delivery fails.

#### Scenario: Enqueue and dispatch after commit
- **WHEN** an operation requests an outbound email
- **THEN** the system writes a `queued` delivery record in the same transaction and attempts delivery only after that transaction commits

#### Scenario: Do not block the origin on failure
- **WHEN** the email provider rejects or cannot be reached for a queued delivery
- **THEN** the originating operation still succeeds and the delivery is recorded as `failed`

#### Scenario: Retry a failed delivery
- **WHEN** a `failed` delivery is retried
- **THEN** the system attempts delivery again and records the resulting status

#### Scenario: Suppress a duplicate scheduled message
- **WHEN** a scheduled message is requested for an account and period that already has a delivery
- **THEN** the system does not create or send a second message for that account and period

#### Scenario: Scheduled message records its recipient
- **WHEN** a scheduled message is dispatched
- **THEN** the delivery records the recipient account's address, the template, and the period it covers

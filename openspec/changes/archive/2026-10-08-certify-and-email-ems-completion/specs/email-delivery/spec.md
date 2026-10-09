## Purpose

Send transactional email from the application through a durable, auditable outbox that keeps message generation, delivery records, and resending in one place for certificates today and other messages later.

## ADDED Requirements

### Requirement: Outbound email is queued durably and dispatched outside the originating transaction

The system SHALL record an outbound email as a durable delivery record before attempting to send it, and SHALL attempt delivery only after the transaction that requested it has committed. A delivery SHALL be keyed to its message template, its source, and its recipient, and SHALL carry a status of `queued`, `sent`, `failed`, or `skipped`. The originating operation SHALL NOT fail or roll back because delivery fails.

#### Scenario: Enqueue and dispatch after commit
- **WHEN** an operation requests an outbound email
- **THEN** the system writes a `queued` delivery record in the same transaction and attempts delivery only after that transaction commits

#### Scenario: Do not block the origin on failure
- **WHEN** the email provider rejects or cannot be reached for a queued delivery
- **THEN** the originating operation still succeeds and the delivery is recorded as `failed`

#### Scenario: Retry a failed delivery
- **WHEN** a `failed` delivery is retried
- **THEN** the system attempts delivery again and records the resulting status

### Requirement: Messages use typed, branded templates

The system SHALL render each message from a typed, versioned template that produces a branded HTML body. Templates SHALL be addressed by a stable identifier and SHALL render the same content for a given set of inputs.

#### Scenario: Render a branded message
- **WHEN** the system prepares a message from a template
- **THEN** the message body is the template's branded HTML rendering for the supplied inputs

### Requirement: Delivery is audited without retaining content

The system SHALL record the template, the source reference, the recipient, the sender address, the resulting status, and the server timestamp for each delivery attempt, and SHALL record the provider's message identifier on acceptance. The system SHALL NOT retain generated attachment bytes.

#### Scenario: Record a successful send
- **WHEN** the email provider accepts a delivery
- **THEN** the system records the plaintext recipient, the template, the source reference, and the provider message identifier

#### Scenario: Do not retain attachment bytes
- **WHEN** a delivery with an attachment completes
- **THEN** the system retains no copy of the attachment bytes

### Requirement: Email uses one shared, configured sender

The system SHALL send all outbound email through one shared provider client using the verified `noreply@winchesterfireems.com` sender and the server-only API key, and SHALL fail a delivery cleanly when email is not configured.

#### Scenario: Missing configuration
- **WHEN** the outbound email configuration is absent and a delivery is attempted
- **THEN** the delivery is recorded as `failed` without exposing provider details

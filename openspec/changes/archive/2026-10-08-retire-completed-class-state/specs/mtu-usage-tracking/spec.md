## RENAMED Requirements

- FROM: `### Requirement: MTU usage is editable until finalization`
- TO: `### Requirement: MTU usage is editable at any time`

## MODIFIED Requirements

### Requirement: MTU usage is editable at any time
The system SHALL allow authorized staff to change a class's MTU usage at any time, including while the class is open and after it is finalized. The review page SHALL display and edit the current operational MTU usage independently of the class and roster lock. MTU changes SHALL be audited and SHALL NOT alter signed revision facts or official roster PDFs.

#### Scenario: Edit MTU usage while open
- **WHEN** staff change a class's MTU mileage while the class is open
- **THEN** the system saves the new value

#### Scenario: Edit MTU usage after finalization
- **WHEN** staff change a class's MTU usage after the class is finalized
- **THEN** the system saves the new value without requiring the class to be reopened

## REMOVED Requirements

### Requirement: MTU usage is preserved at finalization
**Reason**: MTU usage is operational data edited independently of finalization. Official roster PDFs do not render MTU fields.
**Migration**: Existing immutable snapshots remain untouched. New revisions do not need an MTU snapshot; the review page uses the current operational record.

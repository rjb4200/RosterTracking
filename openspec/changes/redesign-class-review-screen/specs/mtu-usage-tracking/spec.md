## REMOVED Requirements

### Requirement: MTU usage is editable at any time
**Reason**: MTU usage is now edited inside the review screen's Confirm class step while the class is open, instead of a standalone section that is editable at any time including after finalization.
**Migration**: Edit MTU usage on the review screen's Confirm class step before finalizing. To change it after finalization, reopen the class.

## ADDED Requirements

### Requirement: MTU usage is edited on the review screen while the class is open

The system SHALL let an assigned instructor or an elevated operator edit a class's MTU usage on the review screen's Confirm class step while the class is open, presented as grouped collapsible sections for equipment, supplies, transport, and additional details. The edit SHALL be audited and SHALL NOT alter signed revision facts — the finalized participant count and revision number — or official roster PDFs. After finalization, MTU usage SHALL be changed only through the reopen path.

#### Scenario: Edit MTU usage while open
- **WHEN** an instructor assigned to the class saves MTU usage on the Confirm class step
- **THEN** the system saves the new value

#### Scenario: Deny an unassigned operator
- **WHEN** an operator who is neither assigned to the class nor an elevated role attempts to change its MTU usage
- **THEN** the system denies the change

#### Scenario: Require reopening after finalization
- **WHEN** a class is finalized
- **THEN** its MTU usage is not editable until the class is reopened

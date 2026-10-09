## MODIFIED Requirements

### Requirement: Initial official-form scope is limited
The system SHALL support KFS-1A (October 2023) and the KFS-1B individual training notice. The KBEMS-E16 form SHALL NOT be offered as an output. The system SHALL not generate FEMA roster PDFs in this capability.

#### Scenario: Exclude deferred and retired forms
- **WHEN** staff view available official roster types
- **THEN** FEMA and KBEMS-E16 are not offered as generation options

## ADDED Requirements

### Requirement: The Fire roster appends individual training notices

The system SHALL append the Yellow KFS-1B individual training notice pages, one per qualifying participant, to the Fire roster (KFS-1A) output for view, download, and email. The appended notices SHALL follow the same access rule as the roster and SHALL be omitted when no participant qualifies.

#### Scenario: Append notices to the Fire roster
- **WHEN** a finalized Fire class has participants outside the host agency
- **THEN** viewing, downloading, or emailing the Fire roster includes the Yellow individual training notice pages after the roster pages

#### Scenario: No notices when none qualify
- **WHEN** every participant represents the host agency
- **THEN** the Fire roster output contains only the roster pages

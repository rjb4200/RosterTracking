## ADDED Requirements

### Requirement: Reports workspace

The system SHALL provide a Reports workspace for Administrators and Training Majors and SHALL deny access to staff without the report permission. The workspace SHALL be reachable from the staff navigation labeled "Reports".

#### Scenario: A Training Major opens Reports
- **WHEN** a Training Major opens the Reports workspace
- **THEN** the system shows the Reports workspace

#### Scenario: An Administrator opens Reports
- **WHEN** an Administrator opens the Reports workspace
- **THEN** the system shows the Reports workspace

#### Scenario: Staff without the report permission are denied
- **WHEN** a staff member without the report permission requests the Reports workspace
- **THEN** the system denies access

### Requirement: Generate a report for a time frame

The system SHALL let an authorized user select a time frame and a report and generate it, and SHALL return the result as a file download. The user SHALL select both a time frame and a report before generating.

#### Scenario: Generate a selected report
- **WHEN** an authorized user selects a time frame and a report and generates it
- **THEN** the system produces the report for that time frame and downloads the file

#### Scenario: A time frame is required
- **WHEN** an authorized user attempts to generate without a time frame
- **THEN** the system blocks generation and asks for the time frame

#### Scenario: A report selection is required
- **WHEN** an authorized user attempts to generate without selecting a report
- **THEN** the system blocks generation and asks for the report

### Requirement: The report catalog is extensible

The workspace SHALL present the available reports and SHALL allow a new report to be added to the catalog without changing the time-frame, selection, or download behavior of the workspace.

#### Scenario: The catalog lists available reports
- **WHEN** an authorized user opens the Reports workspace
- **THEN** the system lists each available report by name

#### Scenario: A new report reuses the same flow
- **WHEN** a new report is added to the catalog
- **THEN** it appears in the catalog and generates through the same time-frame and download flow as existing reports

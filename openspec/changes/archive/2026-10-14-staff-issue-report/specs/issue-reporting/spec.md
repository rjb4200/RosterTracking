## ADDED Requirements

### Requirement: Staff can report an issue from the app

The system SHALL offer staff, from within the authenticated staff workspace, a report affordance that opens a form with a category, a subject, and a description, and SHALL file a GitHub issue on the application's repository when the form is submitted. On success the system SHALL show the created issue's link.

#### Scenario: Open the report form
- **WHEN** a staff member chooses to report an issue
- **THEN** the system presents a form with a category, a subject, and a description

#### Scenario: File an issue
- **WHEN** a staff member submits a report with a category, a subject, and a description
- **THEN** the system creates a GitHub issue on the application's repository and shows its link

#### Scenario: Category maps to a label
- **WHEN** a staff member submits a report with a chosen category
- **THEN** the created issue carries a label for that category

### Requirement: The report captures context automatically

The system SHALL include, without the reporter entering it, the page route, the environment, the reporting staff member's identity and role, a timestamp, and the class when the report is made from a class page. When a correlation id is available, the system SHALL include it.

#### Scenario: Context is attached
- **WHEN** a staff member files a report from a staff page
- **THEN** the issue body includes the route, environment, staff identity and role, and a timestamp

#### Scenario: Class context is attached
- **WHEN** a staff member files a report from a class page
- **THEN** the issue body includes that class

### Requirement: The report warns against student personal data

The system SHALL warn the reporter not to include student names, phone numbers, or credentials in the report.

#### Scenario: The warning is shown
- **WHEN** the report form is presented
- **THEN** it warns that student names, phone numbers, and credentials should not be included

### Requirement: Reporting degrades when unconfigured

When the GitHub issue token is not configured, the system SHALL NOT offer the report affordance and SHALL refuse a report.

#### Scenario: No affordance without a token
- **WHEN** the GitHub issue token is not configured
- **THEN** the report affordance is not offered

### Requirement: A failed page offers to report the problem

When a staff page fails to load, the staff error screen SHALL offer the report action so the reporter can file the problem from the failed page.

#### Scenario: Report from the error screen
- **WHEN** a staff page fails to load
- **THEN** the error screen offers to report the problem

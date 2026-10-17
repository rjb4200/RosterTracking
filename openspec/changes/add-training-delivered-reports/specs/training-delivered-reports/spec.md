## ADDED Requirements

### Requirement: KBEMS CE requirements reference block

The training-delivered reports SHALL render a KBEMS CE requirements reference block at the top listing the hours required per content category — including Pediatric — for each clinician level (EMR, EMT, AEMT, Paramedic), and a total row that sums every category. The block SHALL be compact and SHALL be labeled as reference requirement hours that are not the reader's or student's completed hours. The block SHALL be identical across every training-delivered report and SHALL be defined independently of the editable EMS category catalog, so adding, renaming, or archiving a category does not change it.

#### Scenario: The reference block is printed

- **WHEN** an authorized user generates any training-delivered report
- **THEN** the report shows the requirements block with per-level required hours, the total row, and the Pediatric requirement

#### Scenario: The block is the same on every report

- **WHEN** the student transcript, the agency report, and the site report are generated
- **THEN** each shows the same requirements block

#### Scenario: Catalog edits do not change the block

- **WHEN** an EMS category is renamed or archived in the catalog
- **THEN** the requirements block is unchanged

### Requirement: Renewal-period selection

The Reports workspace SHALL let an authorized user choose the report period from calculated renewal-cycle presets — the last, current, and next two-year cycles, each ending 12/31 — or from custom start and end dates. Selecting a preset SHALL prefill the start and end dates. The presets SHALL be derived from the cycle rule and the current date rather than stored, so they advance as the calendar year changes without configuration.

#### Scenario: A preset fills the dates

- **WHEN** the user selects a renewal-cycle preset
- **THEN** the start and end dates are prefilled with that cycle's window

#### Scenario: A custom range is allowed

- **WHEN** the user enters a custom start date and end date
- **THEN** the report period is that custom range

#### Scenario: Presets advance with the year

- **WHEN** the calendar year changes
- **THEN** the offered presets reflect the renewed cycles without any configuration change

#### Scenario: An invalid range is blocked

- **WHEN** the end date precedes the start date
- **THEN** the system blocks generation and asks for a valid range

### Requirement: Per-report inputs

The Reports workspace SHALL support reports that require an additional input beyond the period — a student, an agency, or a training site — and SHALL block generation of such a report until that input is selected.

#### Scenario: The student transcript requires a student

- **WHEN** the user attempts to generate the student transcript without selecting a student
- **THEN** the system blocks generation and asks for a student

#### Scenario: The agency report requires an agency

- **WHEN** the user attempts to generate the agency report without selecting an agency
- **THEN** the system blocks generation and asks for an agency

#### Scenario: The site report requires a site

- **WHEN** the user attempts to generate the site report without selecting a training site
- **THEN** the system blocks generation and asks for a training site

### Requirement: The workspace selects the report first

The Reports workspace SHALL present the report selector before the report's other inputs, and SHALL reveal only the inputs a selected report needs. The renewal-cycle presets SHALL be shown only for reports driven by a renewal cycle, and the period controls SHALL be hidden for a report that does not use a period.

#### Scenario: Selecting a report reveals its inputs

- **WHEN** the user selects a report
- **THEN** the workspace shows that report's additional input and its period controls

#### Scenario: The renewal presets are hidden for a plain date range

- **WHEN** the user selects a report that uses a custom date range rather than a renewal cycle
- **THEN** the workspace shows the start and end dates without the renewal-cycle presets

#### Scenario: A report without a period hides the period controls

- **WHEN** the user selects a report that does not use a period
- **THEN** the workspace hides the period controls

### Requirement: Student CE transcript

The system SHALL generate a student CE transcript as a downloadable PDF containing the requirements reference block and a flat list of the training delivered to the selected student within the period, ordered by category and then by date. Each included class SHALL contribute a row with the class date, course name, category, and credited hours, and the log SHALL total the credited hours. Each included class SHALL be classified exactly once: the class's EMS category; otherwise "Uncategorized" for a class that reported to KBEMS but has no EMS category; otherwise "Other" for a class that reported only to Fire. A class SHALL be included only when the student has active (non-removed) attendance in it, it is not cancelled, and its class date — the earliest scheduled component start — falls within the period.

#### Scenario: The transcript lists delivered training

- **WHEN** a Training Major generates the student transcript for a period containing the student's classes
- **THEN** the PDF shows the requirements block and each in-period class with its date, course, category, and credited hours, and a total of the credited hours

#### Scenario: The log is ordered by category, not by date

- **WHEN** the transcript includes classes in more than one category
- **THEN** the rows appear in category order, and within a category in date order

#### Scenario: Other and Uncategorized classification

- **WHEN** the period includes a Fire-only class and a KBEMS class with no EMS category
- **THEN** the Fire-only class appears as "Other" and the category-less KBEMS class appears as "Uncategorized"

#### Scenario: A dual Fire and KBEMS class appears once

- **WHEN** the student attended a class that reported to both Fire and KBEMS
- **THEN** the class appears exactly once in the log, under its EMS category

#### Scenario: An empty period still produces the transcript

- **WHEN** the period contains none of the student's in-scope classes
- **THEN** the PDF shows the requirements block and an empty log with a zero total rather than failing

#### Scenario: Credits reflect per-student hours

- **WHEN** a class's attendance credited hours were adjusted for the student
- **THEN** the transcript shows the adjusted credited hours for that class

### Requirement: Transcript certificate packet

The student CE transcript SHALL offer a second download that appends each included class's completion certificate after the transcript as a single file. Only included classes that have a completion certificate SHALL contribute a certificate page.

#### Scenario: The transcript is bundled with certificates

- **WHEN** the user chooses the transcript-with-certificates download
- **THEN** the resulting file contains the transcript followed by each available included-class certificate

#### Scenario: Classes without a certificate add no page

- **WHEN** an included class has no completion certificate
- **THEN** no certificate page is added for that class

### Requirement: Agency training delivered report

The system SHALL generate an agency report as a downloadable PDF listing the training delivered for the selected agency over the period — the classes, courses, categories, hours, and students, ordered by category and then by date — and SHALL include only classes whose class date falls within the period.

#### Scenario: Agency activity is listed

- **WHEN** a Training Major generates the agency report for a period and agency
- **THEN** the report lists the training delivered for that agency within the period

#### Scenario: Out-of-period classes are excluded

- **WHEN** a class falls outside the selected period
- **THEN** it is excluded from the agency report

### Requirement: Training-site training delivered report

The system SHALL generate a training-site report as a downloadable PDF listing the training delivered at the selected training site over the period — the classes, courses, categories, hours, and students, ordered by category and then by date — and SHALL include only classes held at that site whose class date falls within the period.

#### Scenario: Site activity is listed

- **WHEN** a Training Major generates the site report for a period and site
- **THEN** the report lists the training delivered at that site within the period

#### Scenario: Other sites are excluded

- **WHEN** a class is held at a different training site
- **THEN** it is excluded from the site report

### Requirement: Training-delivered report access

The training-delivered reports SHALL be available on the Reports workspace to Administrators and Training Majors and SHALL deny staff without the report permission.

#### Scenario: Authorized users can generate the reports

- **WHEN** a Training Major or Administrator opens the Reports workspace
- **THEN** the training-delivered reports are available to generate

#### Scenario: Unauthorized users are denied

- **WHEN** a staff member without the report permission requests a training-delivered report
- **THEN** the system denies access

### Requirement: Student quick link

The student detail page SHALL provide a link that opens the student CE transcript on the Reports workspace with the student preselected.

#### Scenario: The link preselects the student

- **WHEN** a user follows the CE transcript link from a student's detail page
- **THEN** the Reports workspace opens the student transcript with that student preselected

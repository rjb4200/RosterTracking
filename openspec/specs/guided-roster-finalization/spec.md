# Guided Roster Finalization Specification

## Purpose

Give instructors one focused after-class screen for reconciling attendance and deliberately creating a locked final roster.

## Requirements

### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a dedicated completed-class review screen that shows the class summary, scheduled hours, active and removed attendance, credited hours, adjustment reasons, reporting readiness, and the finalization action. The review screen SHALL organize its content into distinct sections for finalization, documents, revision history, corrections, and attendance. The review screen SHALL remain available after the class is finalized, presenting the finalized state and its locked revision instead of a not-found result. While a class is completed the review screen SHALL be the confirm-and-correct step for that class: it SHALL present the class details, sessions, instructors, and roster with editing affordances, and SHALL withhold finalization until the roster is ready. While it is finalized the review screen SHALL present the class and roster as read-only, SHALL omit editing affordances, and SHALL present the reopen path. The documents section SHALL provide one View action per class document that opens the rendered PDF inline: the class sign-in record and the class audit log at any reviewed status, and, when a finalized revision exists, the KFS-1A roster, the KBEMS-E16 roster, and the completion certificates for the latest finalized revision. While the class is completed but not finalized, the documents section SHALL indicate that official rosters and certificates require finalization. The review screen SHALL NOT offer separate print or download actions for these documents. Outputs for older revisions SHALL remain reachable from the revision history section.

#### Scenario: Review a completed class
- **WHEN** an authorized operator opens a completed class review
- **THEN** the system presents the class summary, all roster records, and the next required review actions in one workflow

#### Scenario: Correct the class before finalizing
- **WHEN** an authorized operator opens the review screen for a completed class
- **THEN** the screen offers editing for the class details, sessions, instructors, and roster without leaving that screen

#### Scenario: Identify a reporting exception
- **WHEN** an active attendance record lacks reporting-required context
- **THEN** the review identifies that record and blocks finalization until it is resolved or removed

#### Scenario: Withhold finalization while the roster needs work
- **WHEN** a completed class's roster has unresolved issues
- **THEN** the review screen names the issues and the finalization action is unavailable

#### Scenario: Remain on the review after finalizing
- **WHEN** an authorized operator finalizes a roster-ready completed class from its review screen
- **THEN** the review screen presents the finalized class and its locked revision instead of a not-found result

#### Scenario: Review a finalized class read-only
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the system presents the class summary and roster as read-only, omits roster-editing actions, and offers the reopen path

#### Scenario: Reopen from the review screen
- **WHEN** an authorized operator supplies a reopen reason from the finalized review screen
- **THEN** the class returns to its editable lifecycle home without a not-found result and prior revisions remain retained

#### Scenario: Present class documents
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the documents section offers a single View action for the sign-in record, the audit log, each official roster, and the completion certificates

#### Scenario: Withhold official outputs before finalization
- **WHEN** an authorized operator opens the review screen for a completed but not finalized class
- **THEN** the documents section offers the sign-in record and audit log and indicates that official rosters and certificates require finalization

#### Scenario: Target the latest revision
- **WHEN** a class has more than one finalization revision
- **THEN** the documents section presents the outputs of the latest revision and older revision outputs remain reachable from the revision history section

#### Scenario: Open a document inline
- **WHEN** an authorized operator chooses View for a document
- **THEN** the system opens the rendered PDF inline for viewing, printing, or downloading through the browser

### Requirement: Guided credit adjustment reasons
The review workflow SHALL offer Late Arrival, Left Early, Partial Attendance, Instructor Adjustment, and Other as adjustment reasons. Other SHALL require an operator-supplied explanation.

#### Scenario: Select a standard adjustment reason
- **WHEN** an operator changes credited hours below the scheduled total and selects Left Early
- **THEN** the system records Left Early as the adjustment reason

#### Scenario: Explain another adjustment
- **WHEN** an operator selects Other for an adjusted credit value
- **THEN** the system requires a non-empty explanation before saving the adjustment

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize-and-sign action on the completed-class review screen only to the class's lead instructor, and SHALL require the certification and typed name before finalizing. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the review, its documents, and its readiness, but SHALL NOT be offered the finalize-and-sign action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the completed-class review for a roster-ready class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the completed-class review
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision

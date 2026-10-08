# Guided Roster Finalization Specification

## Purpose

Give instructors one focused after-class screen for reconciling attendance and deliberately creating a locked final roster.
## Requirements
### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a review screen that serves two roles: while a class is open it is the confirm-and-correct finalization workbench, and while it is finalized it is the read-only record of the locked revision.

While the class is open the review screen SHALL present a read-only Class details summary near the top, the class summary, scheduled hours, active and removed attendance, credited hours and adjustment reasons, reporting readiness, the finalization action, and editing affordances for the class details, sessions, instructors, credited hours, and attendance removal. It SHALL withhold finalization until the roster is ready. It SHALL NOT offer manual attendance entry.

While the class is finalized the review screen SHALL present the signed class and roster as read-only and omit their editing affordances. A separate operational MTU section SHALL remain editable by authorized staff without reopening. The reopen path SHALL appear in a dedicated reopening section placed after the attendance sections at the end of the screen.

The review screen SHALL organize its content into distinct sections for the class details, finalization, documents, revision history, corrections, attendance, and reopening. The documents section SHALL present the class sign-in record, the class audit log, the KFS-1A roster, the KBEMS-E16 roster, and the completion certificates as peer rows in one list, each with a View action that opens the rendered PDF inline; the sign-in record and audit log SHALL be available at any reviewed status, and the rosters and certificates SHALL be available when a finalized revision exists. The completion-certificates row SHALL appear only when the latest finalized revision reported to KBEMS. Each roster row SHALL additionally offer an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The reopening section SHALL be presented only to operators who may reopen the class. While the class is open the documents section SHALL indicate that official rosters and certificates require finalization.

#### Scenario: Review an open class
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** the system presents the Class details summary, the class and roster facts, and the review and finalization actions in one workflow

#### Scenario: Correct the class before finalizing
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** the screen offers editing for the class details, sessions, instructors, credited hours, and attendance removal without leaving that screen

#### Scenario: Identify a reporting exception
- **WHEN** an active attendance record lacks reporting-required context
- **THEN** the review identifies that record and blocks finalization until it is resolved or removed

#### Scenario: Withhold finalization while the roster needs work
- **WHEN** an open class's roster has unresolved issues
- **THEN** the review screen names the issues and the finalization action is unavailable

#### Scenario: Remain on the review after finalizing
- **WHEN** an authorized operator finalizes a roster-ready open class from its review screen
- **THEN** the review screen presents the finalized class and its locked revision instead of a not-found result

#### Scenario: Review a finalized class read-only
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the system presents the Class details summary and roster as read-only, omits roster-editing actions, and offers the reopen path

#### Scenario: Reopen from the review screen
- **WHEN** an authorized operator who may reopen opens the review screen for a finalized class
- **THEN** the screen presents a dedicated reopening section after the attendance sections at the end of the screen

#### Scenario: Hide the reopen section from other operators
- **WHEN** an operator who may not reopen opens the review screen for a finalized class
- **THEN** the screen does not present the reopening section

#### Scenario: Present class documents
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the documents section lists the sign-in record, the audit log, the KFS-1A roster, the KBEMS-E16 roster, and the completion certificates as peer rows, each with a View action

#### Scenario: Reveal the roster email recipient on demand
- **WHEN** an authorized operator chooses the Email action for a roster row
- **THEN** the system reveals the recipient field for that row, and the recipient field is not shown until the action is chosen

#### Scenario: Hide certificates when the revision did not report to KBEMS
- **WHEN** the latest finalized revision did not report to KBEMS
- **THEN** the documents section does not present a completion-certificates row

#### Scenario: Withhold official outputs before finalization
- **WHEN** an authorized operator opens the review screen for an open class
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

The system SHALL present the finalize-and-sign action on the review screen only to the class's lead instructor while the class is open, and SHALL require the certification and typed name before finalizing. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the review, its documents, and its readiness, but SHALL NOT be offered the finalize-and-sign action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision


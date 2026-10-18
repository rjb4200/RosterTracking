## MODIFIED Requirements

### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a review screen that serves two roles: while a class is open it is the confirm-and-correct finalization workbench, and while it is finalized it is the read-only record of the locked revision.

While the class is open the review screen SHALL present an ordered checklist of cards — Attendance, Reporting & MTU, and Sign & finalize — carrying the active attendance with its credited hours and adjustment reasons, the reporting readiness, and the finalization action, and SHALL present editing affordances for the class details, sessions, instructors, credited hours, and attendance removal. It SHALL withhold finalization until the roster is ready. It SHALL NOT offer manual attendance entry. It SHALL omit a section that has no content, including the removed-attendance section when no participant was removed. It SHALL name each roster-readiness issue by the participant it concerns rather than by an internal record identifier.

While the class is finalized the review screen SHALL present the signed class and roster as read-only and omit their editing affordances. The reopen path SHALL appear in a dedicated reopening section placed after the attendance sections at the end of the screen.

The review screen SHALL organize its content as an ordered checklist for the open-class workflow and supporting sections for the class details, finalization, documents, revision history, corrections, attendance, and reopening. The documents section SHALL present the class sign-in record, the class audit log, the KFS-1A roster, and the completion-certificate batch as peer rows in one list, each with a View action that opens the rendered PDF inline; the sign-in record and audit log SHALL be available at any reviewed status, and the roster and certificate batch SHALL be available when a finalized revision exists. The completion-certificate batch row SHALL appear only when the latest finalized revision reported to KBEMS. The KFS-1A roster row SHALL additionally offer an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The reopening section SHALL be presented only to operators who may reopen the class. While the class is open the documents section SHALL indicate that the official roster and certificates require finalization.

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

#### Scenario: Name the readiness issue by participant
- **WHEN** an active participant's credited hours or reporting context is invalid
- **THEN** the review screen names that participant in the readiness issue rather than showing the attendance record identifier

#### Scenario: Omit an empty removed-attendance section
- **WHEN** an open class has no removed attendance
- **THEN** the review screen does not present a removed-attendance section

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
- **THEN** the documents section lists the sign-in record, the audit log, the KFS-1A roster, and the completion-certificate batch as peer rows, each with a View action

#### Scenario: Reveal the roster email recipient on demand
- **WHEN** an authorized operator chooses the Email action for a roster row
- **THEN** the system reveals the recipient field for that row, and the recipient field is not shown until the action is chosen

#### Scenario: Hide certificates when the revision did not report to KBEMS
- **WHEN** the latest finalized revision did not report to KBEMS
- **THEN** the documents section does not present a completion-certificate batch row

#### Scenario: Withhold official outputs before finalization
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** the documents section offers the sign-in record and audit log and indicates that the official roster and certificates require finalization

#### Scenario: Target the latest revision
- **WHEN** a class has more than one finalization revision
- **THEN** the documents section presents the outputs of the latest revision and older revision outputs remain reachable from the revision history section

#### Scenario: Open a document inline
- **WHEN** an authorized operator chooses View for a document
- **THEN** the system opens the rendered PDF inline for viewing, printing, or downloading through the browser

## ADDED Requirements

### Requirement: The review screen adjusts a class that ran long

For an open class, the review screen SHALL present the class scheduled total with an adjustment affordance. Increasing the scheduled total SHALL credit every active participant whose credited hours equal the previous total with the new total and SHALL leave participants credited below the previous total unchanged. The system SHALL continue to accept a participant's credited hours only from zero through the current scheduled total.

#### Scenario: Credit everyone after a class runs long
- **WHEN** an authorized operator increases the class scheduled total on an open class
- **THEN** every active participant still credited at the previous total is credited at the new total

#### Scenario: Leave individually adjusted participants unchanged
- **WHEN** an authorized operator increases the class scheduled total while a participant is credited below the previous total with a reason
- **THEN** that participant keeps the lower credited hours and the recorded reason

#### Scenario: Keep credit within the new total
- **WHEN** an authorized operator sets a participant's credited hours after the scheduled total changed
- **THEN** the system accepts the value only from zero through the current scheduled total

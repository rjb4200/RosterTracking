## MODIFIED Requirements

### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a dedicated completed-class review screen that shows the class summary, scheduled hours, active and removed attendance, credited hours, adjustment reasons, reporting readiness, and the finalization action. The review screen SHALL organize its content into distinct sections for finalization, documents, revision history, corrections, attendance, and reopening. The review screen SHALL remain available after the class is finalized, presenting the finalized state and its locked revision instead of a not-found result. While a class is completed the review screen SHALL be the confirm-and-correct step for that class: it SHALL present the class details, sessions, instructors, and roster with editing affordances, and SHALL withhold finalization until the roster is ready. While it is finalized the review screen SHALL present the class and roster as read-only, SHALL omit editing affordances, and SHALL present the reopen path in a dedicated reopening section placed after the attendance sections at the end of the screen. The documents section SHALL present the class sign-in record, the class audit log, the KFS-1A roster, the KBEMS-E16 roster, and the completion certificates as peer rows in one list, each with a View action that opens the rendered PDF inline; the sign-in record and audit log SHALL be available at any reviewed status, and the rosters and certificates SHALL be available when a finalized revision exists. The completion-certificates row SHALL appear only when the latest finalized revision reported to KBEMS. Each roster row SHALL additionally offer an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The reopening section SHALL be presented only to operators who may reopen the class. While the class is completed but not finalized, the documents section SHALL indicate that official rosters and certificates require finalization. The review screen SHALL NOT offer separate print or download actions for these documents. Outputs for older revisions SHALL remain reachable from the revision history section.

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
- **WHEN** an authorized operator opens the review screen for a completed but not finalized class
- **THEN** the documents section offers the sign-in record and audit log and indicates that official rosters and certificates require finalization

#### Scenario: Target the latest revision
- **WHEN** a class has more than one finalization revision
- **THEN** the documents section presents the outputs of the latest revision and older revision outputs remain reachable from the revision history section

#### Scenario: Open a document inline
- **WHEN** an authorized operator chooses View for a document
- **THEN** the system opens the rendered PDF inline for viewing, printing, or downloading through the browser

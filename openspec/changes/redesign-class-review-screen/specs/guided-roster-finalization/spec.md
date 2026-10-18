## MODIFIED Requirements

### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a review screen that serves two roles: while a class is open it is the confirm-and-correct finalization workbench, and while it is finalized it is the read-only record of the locked revision.

While the class is open the review screen SHALL present three ordered steps:

1. **Confirm class** — the class details, the assigned instructors, the scheduled sessions, and, for a class whose destinations include the Mobile Training Unit, the equipment, supplies, and transport used. Each group SHALL be presented inline on the screen with an editing affordance, and SHALL be collapsed to a one-line summary until the operator opens it. The sessions group SHALL state the class scheduled total and SHALL offer a control to change a session's credited hours, so a class that ran long is recorded here.

2. **Review roster** — the active attendance as a compact table with one row per participant showing the participant, their status, the credited hours, the adjustment, and the row actions. A row SHALL expand to its detail only when the participant needs attention for an invalid credit or a missing reporting context. The removed attendance SHALL be presented behind a collapsed affordance only when a participant was removed.

3. **Finalize & export** — the roster readiness, the certification, the signature, and the finalize action presented as one action block. The step SHALL be usable in seconds: it SHALL require only the certification and the signature, and SHALL NOT present class, session, instructor, MTU, or attendance editing.

The review screen SHALL withhold finalization until the roster is ready. It SHALL NOT offer manual attendance entry. It SHALL name each roster-readiness issue by the participant it concerns rather than by an internal record identifier.

While the class is finalized the review screen SHALL present the signed class and roster as read-only and omit their editing affordances. The reopen path SHALL appear in a dedicated reopening section placed after the roster at the end of the screen.

The review screen SHALL present the class sign-in record, the class audit log, the KFS-1A roster, and the completion-certificate batch as peer rows in one documents section, each with a View action that opens the rendered PDF inline; the sign-in record and audit log SHALL be available at any reviewed status, and the roster and certificate batch SHALL be available when a finalized revision exists. The completion-certificate batch row SHALL appear only when the latest finalized revision reported to KBEMS. The KFS-1A roster row SHALL additionally offer an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The reopening section SHALL be presented only to operators who may reopen the class. While the class is open the documents section SHALL indicate that the official roster and certificates require finalization.

#### Scenario: Present the three finalization steps
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** the system presents Confirm class, Review roster, and Finalize & export in order

#### Scenario: Confirm the class inline
- **WHEN** an authorized operator opens the Confirm class step
- **THEN** the class details, instructors, sessions, and MTU usage are each editable inline without leaving the screen, each collapsed to a summary until opened

#### Scenario: Correct the class before finalizing
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** the screen offers editing for the class details, sessions, instructors, credited hours, and attendance removal without leaving that screen

#### Scenario: Present the roster as a compact table
- **WHEN** an authorized operator opens the Review roster step for a class whose participants have no issues
- **THEN** the screen presents one compact row per participant with the name, status, credited hours, adjustment, and row actions

#### Scenario: Expand only the roster rows that need attention
- **WHEN** a participant has an invalid credit or a missing reporting context
- **THEN** that participant's row expands to its detail while the other rows stay compact

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
- **THEN** the screen presents a dedicated reopening section after the roster at the end of the screen

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

### Requirement: MTU classes require recorded usage before signing

For a class whose selected destinations include the Mobile Training Unit, the system SHALL present the equipment, supplies, and transport as grouped, collapsible sections inside the Confirm class step — one group each for Equipment used, Supplies used, Transport, and Additional details — and SHALL record the usage as operational MTU usage when the operator saves that step. Finalizing SHALL require that the class has recorded MTU usage, and SHALL NOT present a separate MTU confirmation step in the finalize action. Completing the step SHALL record the usage without altering the finalized participant count or revision number.

#### Scenario: Require recorded usage for an MTU class
- **WHEN** the lead instructor attempts to finalize a roster-ready MTU class that has no recorded MTU usage
- **THEN** the system withholds the finalize action until the Confirm class step is saved

#### Scenario: Present the usage as grouped sections
- **WHEN** the lead instructor opens the MTU usage group on the Confirm class step
- **THEN** the equipment, supplies, transport, and additional details are presented as separate collapsed sections

#### Scenario: Save usage from the Confirm class step
- **WHEN** the lead instructor changes the equipment, supplies, transport, quantities, or mileage and saves
- **THEN** the system records the changed usage and the finalize action becomes available

#### Scenario: Suggest expected supply quantities
- **WHEN** the lead instructor opens the Supplies used section
- **THEN** each active supply shows its expected quantity for the class

#### Scenario: Skip the group for a non-MTU class
- **WHEN** the lead instructor confirms a class whose destinations do not include the MTU
- **THEN** the system does not present an MTU usage group

#### Scenario: Keep the finalized roster stable
- **WHEN** the MTU usage is recorded and the roster is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize-and-sign action on the review screen only to the class's lead instructor while the class is open, and SHALL require only the certification and the typed name to finalize — for a class whose destinations include the Mobile Training Unit, the class first requiring recorded MTU usage from the Confirm class step. The finalize action SHALL NOT require a draft, a second submission, or any editing. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the review, its documents, and its readiness, but SHALL NOT be offered the finalize-and-sign action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers a single finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision

## ADDED Requirements

### Requirement: The review screen adjusts a class that ran long

For an open class, the Confirm class step SHALL present the class scheduled total with an adjustment affordance on the sessions. Increasing the scheduled total SHALL credit every active participant whose credited hours equal the previous total with the new total and SHALL leave participants credited below the previous total unchanged. The system SHALL continue to accept a participant's credited hours only from zero through the current scheduled total.

#### Scenario: Credit everyone after a class runs long
- **WHEN** an authorized operator increases the class scheduled total on an open class
- **THEN** every active participant still credited at the previous total is credited at the new total

#### Scenario: Leave individually adjusted participants unchanged
- **WHEN** an authorized operator increases the class scheduled total while a participant is credited below the previous total with a reason
- **THEN** that participant keeps the lower credited hours and the recorded reason

#### Scenario: Keep credit within the new total
- **WHEN** an authorized operator sets a participant's credited hours after the scheduled total changed
- **THEN** the system accepts the value only from zero through the current scheduled total

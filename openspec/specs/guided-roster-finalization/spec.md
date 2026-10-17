# Guided Roster Finalization Specification

## Purpose

Give instructors one focused after-class screen for reconciling attendance and deliberately creating a locked final roster.
## Requirements
### Requirement: Guided after-class roster review

The system SHALL provide authorized instructors and elevated staff a review screen that serves two roles: while a class is open it is the confirm-and-correct finalization workbench, and while it is finalized it is the read-only record of the locked revision.

While the class is open the review screen SHALL present a read-only Class details summary near the top, the class summary, scheduled hours, active and removed attendance, credited hours and adjustment reasons, reporting readiness, the finalization action, and editing affordances for the class details, sessions, instructors, credited hours, and attendance removal. It SHALL withhold finalization until the roster is ready. It SHALL NOT offer manual attendance entry.

While the class is finalized the review screen SHALL present the signed class and roster as read-only and omit their editing affordances. A separate operational MTU section SHALL remain editable by authorized staff without reopening. The reopen path SHALL appear in a dedicated reopening section placed after the attendance sections at the end of the screen.

The review screen SHALL organize its content into distinct sections for the class details, finalization, documents, revision history, corrections, attendance, and reopening. The documents section SHALL present the class sign-in record, the class audit log, the KFS-1A roster, and the completion-certificate batch as peer rows in one list, each with a View action that opens the rendered PDF inline; the sign-in record and audit log SHALL be available at any reviewed status, and the roster and certificate batch SHALL be available when a finalized revision exists. The completion-certificate batch row SHALL appear only when the latest finalized revision reported to KBEMS. The KFS-1A roster row SHALL additionally offer an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The reopening section SHALL be presented only to operators who may reopen the class. While the class is open the documents section SHALL indicate that the official roster and certificates require finalization.

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

### Requirement: Guided credit adjustment reasons
The review workflow SHALL offer Late Arrival, Left Early, Partial Attendance, Instructor Adjustment, and Other as adjustment reasons. Other SHALL require an operator-supplied explanation.

#### Scenario: Select a standard adjustment reason
- **WHEN** an operator changes credited hours below the scheduled total and selects Left Early
- **THEN** the system records Left Early as the adjustment reason

#### Scenario: Explain another adjustment
- **WHEN** an operator selects Other for an adjusted credit value
- **THEN** the system requires a non-empty explanation before saving the adjustment

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize-and-sign action on the review screen only to the class's lead instructor while the class is open, and SHALL require the certification, the typed name, and — for a class whose destinations include the Mobile Training Unit — the confirmed MTU usage step before finalizing. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the review, its documents, and its readiness, but SHALL NOT be offered the finalize-and-sign action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision

### Requirement: Finalization reconciles reporting context before locking
Before it reports readiness or validates the roster for an open class, the system SHALL reconcile every active attendance's reporting context with the class's currently resolved reporting requirement sets, so a destination changed after attendance was recorded neither withholds the finalize action nor blocks finalization. A class whose selected reporting systems changed after sign-in SHALL present as ready, finalize successfully, and — when a certificate-bearing reporting system is among its destinations — queue a completion certificate for every active participant with a deliverable email. A context that cannot be derived from the class's selected reporting systems SHALL still be reported as missing and SHALL withhold finalization.

#### Scenario: Review a class whose destinations changed after sign-in
- **WHEN** an authorized operator opens the review screen for an open class whose selected reporting systems changed after attendance was recorded and no save has reconciled the contexts
- **THEN** the system reconciles each active attendance's reporting context and presents the roster as ready to finalize

#### Scenario: Finalize a class whose destinations changed after sign-in
- **WHEN** the lead instructor finalizes a class whose selected reporting systems changed after attendance was recorded
- **THEN** the system reconciles each active attendance's reporting context before validation, finalization succeeds, and the revision is created

#### Scenario: Issue certificates after a destination-driven finalization
- **WHEN** a reopened class is re-finalized with a certificate-bearing reporting system selected among its destinations
- **THEN** the system queues a completion certificate for every active participant with a deliverable email

#### Scenario: Leave a genuinely missing context unresolved
- **WHEN** an active attendance lacks a reporting context that cannot be derived from the class's selected reporting systems
- **THEN** the system still identifies that record and withholds finalization

### Requirement: The review screen manages certificate delivery

The review screen SHALL present, for a finalized EMS class, the certificate delivery state of each active participant: delivered, undeliverable, or failed. It SHALL offer authorized staff a resend action for an individual participant, optionally with a different address, and SHALL list participants without a deliverable email as delivery exceptions with an action to provide an address and send. It SHALL present these controls only to operators who may generate certificates.

#### Scenario: Show participant delivery state
- **WHEN** an authorized operator opens the review screen for a finalized EMS class
- **THEN** the screen shows each active participant's certificate delivery state

#### Scenario: Resend an individual certificate
- **WHEN** an authorized operator chooses to resend a participant's certificate
- **THEN** the system sends that participant's certificate and updates the shown delivery state

#### Scenario: Resolve a delivery exception
- **WHEN** an authorized operator provides an address for a participant listed as a delivery exception
- **THEN** the system sends that participant's certificate to the supplied address

#### Scenario: Hide delivery controls from other operators
- **WHEN** an operator who may not generate certificates opens the review screen for a finalized EMS class
- **THEN** the screen does not present the resend or delivery-exception actions

### Requirement: The review screen offers on-demand training notices

For a finalized Fire class, the review screen SHALL present a collapsed Training notices section that lists every active participant and offers, per participant, a View action that opens the notice inline and an Email action whose recipient field is revealed only when the action is chosen and is hidden otherwise. The section SHALL be available only to operators who may generate official rosters.

#### Scenario: Keep the section collapsed until used
- **WHEN** an authorized operator opens the review screen for a finalized Fire class
- **THEN** the Training notices section is present but collapsed

#### Scenario: List every participant
- **WHEN** the Training notices section is opened
- **THEN** it lists every active participant of the revision, including those who represent the host agency

#### Scenario: Reveal the notice email recipient on demand
- **WHEN** an authorized operator chooses the Email action for a participant
- **THEN** the system reveals the recipient field for that participant, and it is not shown until the action is chosen

#### Scenario: Hide the section from other operators
- **WHEN** an operator who may not generate official rosters opens the review screen for a finalized Fire class
- **THEN** the screen does not present the Training notices section

### Requirement: MTU classes require a usage confirmation step before signing

For a class whose selected destinations include the Mobile Training Unit, the system SHALL present a distinct usage confirmation step before the finalize-and-sign action, and SHALL withhold signing until the step is confirmed. The step SHALL list every active supply with its expected quantity, expanded for supplies with a nonzero expected quantity and presenting the remaining active supplies behind a collapsed affordance, and SHALL allow the lead instructor to confirm or edit the actual quantities, the equipment and transport selections, and the mileage. Completing the step SHALL record the confirmed usage as operational MTU usage without altering the finalized participant count or revision number.

#### Scenario: Require the step for an MTU class
- **WHEN** the lead instructor attempts to finalize a roster-ready MTU class
- **THEN** the system requires the MTU usage step to be confirmed before it presents or accepts the finalize-and-sign action

#### Scenario: Show every active supply without clutter
- **WHEN** the lead instructor opens the MTU usage step
- **THEN** the step expands the active supplies with a nonzero expected quantity and presents the remaining active supplies behind a collapsed affordance

#### Scenario: Change the selection at finalization
- **WHEN** the lead instructor changes the equipment, supplies, or transport selections on the MTU usage step
- **THEN** the system records the changed selections

#### Scenario: Confirm expected quantities
- **WHEN** the lead instructor confirms the MTU usage step without editing
- **THEN** the system records each supply at its expected quantity together with the selected equipment and transport and the mileage

#### Scenario: Edit actual quantities
- **WHEN** the lead instructor changes a supply quantity on the MTU usage step
- **THEN** the system records the edited quantity

#### Scenario: Edit mileage at finalization
- **WHEN** the lead instructor changes the mileage estimate on the MTU usage step
- **THEN** the system records the edited estimate without requiring it

#### Scenario: Skip the step for a non-MTU class
- **WHEN** the lead instructor finalizes a roster-ready class whose destinations do not include the MTU
- **THEN** the system does not present the MTU usage step

#### Scenario: Keep the finalized roster stable
- **WHEN** the MTU usage step is confirmed and the roster is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage


# Guided Roster Finalization Specification

## Purpose

Give instructors one focused after-class screen for reconciling attendance and deliberately creating a locked final roster.
## Requirements
### Requirement: Guided credit adjustment reasons
The review workflow SHALL offer Late Arrival, Left Early, Partial Attendance, Instructor Adjustment, and Other as adjustment reasons. Other SHALL require an operator-supplied explanation.

#### Scenario: Select a standard adjustment reason
- **WHEN** an operator changes credited hours below the scheduled total and selects Left Early
- **THEN** the system records Left Early as the adjustment reason

#### Scenario: Explain another adjustment
- **WHEN** an operator selects Other for an adjusted credit value
- **THEN** the system requires a non-empty explanation before saving the adjustment

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize action on the review screen only to the class's lead instructor while the class is open, as a compact finalization panel containing the certification, the typed signature, and the finalize action. It SHALL require no additional data-entry unless a selected reporting destination requires information that is missing. It SHALL present the finalized revision's recorded signer and signed timestamp to authorized operators. A non-lead operator SHALL still see the workspace, its roster, and its readiness, but SHALL NOT be offered the finalize action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers a single finalize action requiring the certification and the typed signature

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the workspace and its readiness but does not offer the finalize action

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

### Requirement: The review screen adjusts a class that ran long

For an open class, the workspace SHALL present the class scheduled total in its schedule area with an affordance to change it. Increasing the scheduled total SHALL credit every active participant whose credited hours equal the previous total with the new total and SHALL leave participants credited below the previous total unchanged. The system SHALL continue to accept a participant's credited hours only from zero through the current scheduled total.

#### Scenario: Credit everyone after a class runs long
- **WHEN** an authorized operator increases the class scheduled total on an open class
- **THEN** every active participant still credited at the previous total is credited at the new total

#### Scenario: Leave individually adjusted participants unchanged
- **WHEN** an authorized operator increases the class scheduled total while a participant is credited below the previous total with a reason
- **THEN** that participant keeps the lower credited hours and the recorded reason

#### Scenario: Keep credit within the new total
- **WHEN** an authorized operator sets a participant's credited hours after the scheduled total changed
- **THEN** the system accepts the value only from zero through the current scheduled total

### Requirement: The post-class review workspace

For an open class the system SHALL provide one post-class review workspace presenting a concise summary of the class, the schedule, the instructors, the reporting destinations, the roster, and the finalization status. The workspace SHALL let authorized operators correct class configuration, sessions, instructors, reporting destinations, attendance, and credited hours without leaving it, and SHALL show correction controls on demand. The workspace SHALL NOT render every configuration form at once. It SHALL NOT offer manual attendance entry. It SHALL remain usable on desktop, tablet, and phone.

#### Scenario: Open the workspace
- **WHEN** an authorized operator opens the review screen for an open class
- **THEN** one workspace presents the class summary, the schedule, the instructors, the destinations, the roster, and the finalization status

#### Scenario: Correct without leaving the workspace
- **WHEN** an operator corrects class configuration, a session, an instructor, a reporting destination, attendance, or credited hours
- **THEN** the correction is made within the workspace and no separate screen is required

#### Scenario: Show one editor at a time
- **WHEN** an operator opens a correction area
- **THEN** only that area's editor is shown

#### Scenario: Do not offer manual attendance entry
- **WHEN** an operator uses the workspace
- **THEN** the system does not offer manual attendance entry

#### Scenario: Remain usable on a small screen
- **WHEN** an operator opens the workspace on a phone-sized viewport
- **THEN** the workspace remains usable without horizontal scrolling

### Requirement: Review first, edit only when needed

The workspace SHALL open in a review state presenting the class and schedule summary, the instructors and reporting destinations, the active attendance with credited hours, the readiness status with its blockers, and the available finalization action. Each summary area SHALL provide an editing affordance while the class is open, and choosing it SHALL open only that area's editor while preserving the operator's place. After an edit is saved the system SHALL refresh the summary and the readiness before finalization. The roster area SHALL present the active attendance as a compact table with one row per participant showing the participant, status, credited hours, adjustment, and row actions; a row SHALL expand to its detail only when the participant needs attention. Removed attendance SHALL be presented behind a collapsed affordance only when a participant was removed.

#### Scenario: Present the review state
- **WHEN** an authorized operator opens the workspace for an open class
- **THEN** the workspace shows the class and schedule summary, the instructors and destinations, the active attendance and credited hours, the readiness, and the finalization action

#### Scenario: Open one area's editor
- **WHEN** an operator chooses the editing affordance for a summary area
- **THEN** only that area's editor opens and the rest of the workspace keeps its place

#### Scenario: Refresh after a save
- **WHEN** an operator saves an edit in an area
- **THEN** the summary and the readiness status refresh before finalization is available

#### Scenario: Present the roster as a compact table
- **WHEN** a class's active participants have no issues
- **THEN** the roster shows one compact row per participant with the name, status, credited hours, adjustment, and row actions

#### Scenario: Expand only the roster rows that need attention
- **WHEN** a participant has an invalid credit or a missing reporting context
- **THEN** that participant's row expands while the other rows stay compact

#### Scenario: Omit an empty removed-attendance affordance
- **WHEN** a class has no removed attendance
- **THEN** the workspace presents no removed-attendance affordance

### Requirement: Actionable readiness

The system SHALL calculate whether the class is ready to finalize and SHALL show either Ready to finalize or Needs correction. When correction is needed the system SHALL list each blocking issue in plain language, SHALL name the participant or fact it concerns rather than an internal record identifier, and SHALL provide a control that opens the correction area that resolves it. The workspace SHALL withhold finalization while blockers remain.

#### Scenario: Show ready
- **WHEN** the class has no blocking issues
- **THEN** the workspace shows Ready to finalize

#### Scenario: List blockers in plain language
- **WHEN** one or more blocking issues exist
- **THEN** each is listed in plain language and names the participant or fact it concerns rather than an internal record identifier

#### Scenario: Link a blocker to its fix
- **WHEN** a blocking issue is listed
- **THEN** the workspace provides a control that opens the area that resolves it

#### Scenario: Withhold finalization while blocked
- **WHEN** blocking issues remain
- **THEN** the finalize action is unavailable

### Requirement: Destination-specific finalization checks

The workspace SHALL show Mobile Training Unit usage only for a class whose selected destinations include the Mobile Training Unit, with exactly one editing surface for it. For an MTU class, missing usage SHALL be reported as a readiness issue that opens the MTU usage editor, and recording the usage SHALL be part of the pre-finalization workspace. For a class whose destinations do not include the MTU the workspace SHALL NOT show MTU controls. Recording MTU usage SHALL NOT alter the finalized participant count or the revision number.

#### Scenario: Require recorded usage for an MTU class
- **WHEN** an MTU class has no recorded usage
- **THEN** the workspace reports it as a readiness issue and withholds finalization until the usage is recorded

#### Scenario: Open the MTU editor from the issue
- **WHEN** an operator chooses the missing-usage issue
- **THEN** the MTU usage editor opens

#### Scenario: Hide MTU for a non-MTU class
- **WHEN** a class's destinations do not include the Mobile Training Unit
- **THEN** the workspace shows no MTU controls

#### Scenario: Keep the finalized roster stable
- **WHEN** MTU usage is recorded and the class is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage

### Requirement: Documents and delivery

After a finalized revision exists the workspace SHALL present one section offering the class sign-in record, the class audit log, the KFS-1A roster, and the completion-certificate batch, each with a View action that opens the rendered PDF inline. The certificate batch SHALL be offered only when the latest finalized revision reported to KBEMS. The section SHALL present, per active participant, the certificate delivery state — delivered, undeliverable, or failed — with a resend action optionally to a different address, and for a Fire class the individual training notice with a View action and an Email action whose recipient field is revealed only when the action is chosen. These controls SHALL be offered only to operators who may generate the corresponding output. While the class is open the section SHALL be absent.

#### Scenario: Present the outputs after finalization
- **WHEN** an authorized operator opens a finalized class
- **THEN** one section offers the sign-in record, the audit log, and the KFS-1A roster, and offers the completion-certificate batch when the revision reported to KBEMS, each with a View action

#### Scenario: Open a document inline
- **WHEN** an operator chooses View for a document
- **THEN** the system opens the rendered PDF inline for viewing, printing, or downloading through the browser

#### Scenario: Gate the certificate batch on KBEMS
- **WHEN** the latest finalized revision did not report to KBEMS
- **THEN** the section does not offer the completion-certificate batch

#### Scenario: Show delivery state and resend
- **WHEN** a finalized class reported to KBEMS
- **THEN** the section shows each active participant's certificate delivery state and offers a resend action

#### Scenario: Resolve a delivery exception
- **WHEN** a participant has no deliverable email
- **THEN** the section offers an action to provide an address and send that participant's certificate

#### Scenario: Offer training notices for a Fire class
- **WHEN** a finalized class reported to Fire
- **THEN** each active participant offers a View action and an Email action whose recipient field is revealed only when the action is chosen

#### Scenario: Hide controls from other operators
- **WHEN** an operator may not generate the corresponding output
- **THEN** the section does not present that output's controls

#### Scenario: Absent while the class is open
- **WHEN** the class is open
- **THEN** the workspace does not present the documents-and-delivery section

### Requirement: The locked finalized record

After finalization the workspace SHALL present the finalized class and roster as read-only, including the recorded signer, the signed timestamp, the revision number, and the generated outputs, and SHALL omit editing affordances. It SHALL retain the documents-and-delivery section and the revision history. Reopening SHALL be a clearly separated action available only to operators who may reopen, SHALL require a reason, and SHALL retain prior revisions.

#### Scenario: Present the finalized record read-only
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the class and roster are read-only and no editing affordances are offered

#### Scenario: Show the signed record
- **WHEN** a class is finalized
- **THEN** the workspace presents the recorded signer, the signed timestamp, and the revision number

#### Scenario: Reopen with a reason
- **WHEN** an operator who may reopen reopens the class
- **THEN** the system requires a reason and retains the prior revisions

#### Scenario: Hide reopen from other operators
- **WHEN** an operator may not reopen the class
- **THEN** the workspace does not present the reopen action

#### Scenario: Retain history after reopening
- **WHEN** a class has more than one finalization revision
- **THEN** older revision outputs remain reachable from the revision history


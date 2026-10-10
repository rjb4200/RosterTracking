## MODIFIED Requirements

### Requirement: The lead instructor finalizes and signs from the review screen

The system SHALL present the finalize-and-sign action on the review screen only
to the class's lead instructor while the class is open, and SHALL require the
certification, the typed name, and — for a class whose destinations include the
Mobile Training Unit — the confirmed MTU usage step before finalizing. It SHALL
present the finalized revision's recorded signer and signed timestamp to
authorized operators. A non-lead operator SHALL still see the review, its
documents, and its readiness, but SHALL NOT be offered the finalize-and-sign
action.

#### Scenario: Lead instructor finalizes and signs
- **WHEN** the class's lead instructor opens the review screen for a roster-ready open class
- **THEN** the screen offers the finalize-and-sign action requiring the certification and typed name

#### Scenario: Withhold the action from non-lead operators
- **WHEN** a Training Major, Administrator, or assisting instructor opens the review screen for an open class
- **THEN** the screen presents the review and its documents but does not offer the finalize-and-sign action

#### Scenario: Show the recorded signature
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen presents the recorded signer and signed timestamp for the latest revision

## ADDED Requirements

### Requirement: MTU classes require a usage confirmation step before signing

For a class whose selected destinations include the Mobile Training Unit, the
system SHALL present a distinct usage confirmation step before the
finalize-and-sign action, and SHALL withhold signing until the step is
confirmed. The step SHALL list every active supply with its expected quantity,
expanded for supplies with a nonzero expected quantity and presenting the
remaining active supplies behind a collapsed affordance, and SHALL allow the
lead instructor to confirm or edit the actual quantities and the equipment
selections. Completing the step SHALL record the confirmed usage as operational
MTU usage without altering the finalized participant count or revision number.

#### Scenario: Require the step for an MTU class
- **WHEN** the lead instructor attempts to finalize a roster-ready MTU class
- **THEN** the system requires the MTU usage step to be confirmed before it presents or accepts the finalize-and-sign action

#### Scenario: Show every active supply without clutter
- **WHEN** the lead instructor opens the MTU usage step
- **THEN** the step expands the active supplies with a nonzero expected quantity and presents the remaining active supplies behind a collapsed affordance

#### Scenario: Confirm expected quantities
- **WHEN** the lead instructor confirms the MTU usage step without editing
- **THEN** the system records each supply at its expected quantity together with the selected equipment

#### Scenario: Edit actual quantities
- **WHEN** the lead instructor changes a supply quantity on the MTU usage step
- **THEN** the system records the edited quantity

#### Scenario: Skip the step for a non-MTU class
- **WHEN** the lead instructor finalizes a roster-ready class whose destinations do not include the MTU
- **THEN** the system does not present the MTU usage step

#### Scenario: Keep the finalized roster stable
- **WHEN** the MTU usage step is confirmed and the roster is finalized
- **THEN** the finalized participant count and revision number are unaffected by the MTU usage

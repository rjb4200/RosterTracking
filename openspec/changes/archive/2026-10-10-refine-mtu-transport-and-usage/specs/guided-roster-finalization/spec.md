## MODIFIED Requirements

### Requirement: MTU classes require a usage confirmation step before signing

For a class whose selected destinations include the Mobile Training Unit, the
system SHALL present a distinct usage confirmation step before the
finalize-and-sign action, and SHALL withhold signing until the step is
confirmed. The step SHALL list every active supply with its expected quantity,
expanded for supplies with a nonzero expected quantity and presenting the
remaining active supplies behind a collapsed affordance, and SHALL allow the
lead instructor to confirm or edit the actual quantities, the equipment and
transport selections, and the mileage. Completing the step SHALL record the
confirmed usage as operational MTU usage without altering the finalized
participant count or revision number.

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

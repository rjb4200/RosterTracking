## ADDED Requirements

### Requirement: The dashboard lists pending finalize and sign actions

The system SHALL list each class that requires the operator's action on that operator's dashboard, naming the class and the action: finalize for an open class the operator leads, or sign a named document scope for a finalized class whose scope is pending and for which the operator is the required signer. The system SHALL NOT offer the action to an operator who is not the responsible signer. The dashboard SHALL distinguish a pending signature from an unfinalized class.

#### Scenario: Lead sees an open class to finalize
- **WHEN** the class lead opens their dashboard
- **THEN** the dashboard lists each open class they lead with the finalize action

#### Scenario: Fire signer sees a pending Fire scope
- **WHEN** the Fire signer opens their dashboard
- **THEN** the dashboard lists each finalized class whose `fire` scope is pending with the Fire sign action

#### Scenario: Non-signer does not see the sign action
- **WHEN** an assigned instructor who is not the pending scope's signer opens their dashboard
- **THEN** the dashboard does not offer them that scope's sign action

#### Scenario: Distinguish pending from open
- **WHEN** the dashboard lists a finalized class with a pending scope
- **THEN** it identifies the class as finalized and the item as a signature request rather than a finalization request

## REMOVED Requirements

### Requirement: The Fire signer sees the class awaiting their Fire signature

**Reason**: Generalized to the dashboard's pending finalize and sign actions.
**Migration**: Use "The dashboard lists pending finalize and sign actions".

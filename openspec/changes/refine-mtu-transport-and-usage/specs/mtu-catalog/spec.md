## MODIFIED Requirements

### Requirement: The MTU catalog holds equipment and supplies

The system SHALL maintain a department Mobile Training Unit catalog whose
entries are one of three kinds: equipment, which is durable and reused; supplies,
which are consumable; and transport, which is a vehicle used to deliver training.
Each entry SHALL have a name and SHALL be unique within its kind.

#### Scenario: List equipment and supplies
- **WHEN** staff open the MTU catalog management screen
- **THEN** the system lists the equipment entries, the supplies entries, and the transport entries

#### Scenario: List transport
- **WHEN** staff open the MTU catalog management screen
- **THEN** the system lists the transport entries including the Ford Transit van, the department vehicle, and POV

#### Scenario: Reject a duplicate name in a kind
- **WHEN** staff create an equipment entry whose name duplicates an existing equipment entry
- **THEN** the system rejects the duplicate and keeps the single entry

#### Scenario: Allow the same name across kinds
- **WHEN** an equipment entry and a supplies entry share a name
- **THEN** the system treats them as two distinct entries

### Requirement: Supplies carry an expected-consumption rule

Each supply entry SHALL carry an expected-consumption rule consisting of a
per-class base quantity, a per-student quantity, a rounding mode of either
round-up or exact, and a unit label. Equipment and transport entries SHALL NOT
carry a quantity rule. The system SHALL estimate a supply's quantity for a class
as its per-class base plus its per-student quantity multiplied by the number of
active participants, then applying the rounding mode.

#### Scenario: Estimate a per-student supply
- **WHEN** a supply has a per-student quantity of two, no per-class base, and a round-up mode, and the class has ten active participants
- **THEN** the estimated quantity is twenty

#### Scenario: Estimate a per-class supply
- **WHEN** a supply has a per-class base of one, no per-student quantity, and a round-up mode
- **THEN** the estimated quantity is one regardless of the number of participants

#### Scenario: Estimate a mixture and round up
- **WHEN** a supply has a per-class base of one and a per-student quantity of one half with a round-up mode, and the class has three active participants
- **THEN** the estimated quantity is three

#### Scenario: Keep a fractional unit exact
- **WHEN** a supply measured in gallons has an exact rounding mode and a per-student quantity of one quarter, and the class has ten participants
- **THEN** the estimated quantity is two and one half gallons

#### Scenario: Non-supply entries have no quantity rule
- **WHEN** staff create an equipment or transport entry
- **THEN** the system does not present or store a quantity rule for it

## ADDED Requirements

### Requirement: Transport entries carry a mileage requirement

Each transport entry SHALL declare whether selecting it requires a mileage
estimate. The system SHALL provide the Ford Transit van and the department
vehicle as requiring mileage and POV as not requiring it, and SHALL let
administrators set that flag on any transport entry.

#### Scenario: Mark a vehicle as requiring mileage
- **WHEN** an administrator marks a transport entry as requiring mileage
- **THEN** the system records that selecting the entry will require a mileage estimate on a new class

#### Scenario: Mark a vehicle as not requiring mileage
- **WHEN** an administrator leaves a transport entry as not requiring mileage
- **THEN** selecting that entry does not require a mileage estimate

#### Scenario: POV does not require mileage
- **WHEN** staff view the seeded transport entries
- **THEN** POV is present and marked as not requiring mileage

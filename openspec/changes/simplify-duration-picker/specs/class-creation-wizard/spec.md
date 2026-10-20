## MODIFIED Requirements

### Requirement: Class duration defaults to two hours
The class-and-schedule step SHALL default the scheduled duration to two hours and SHALL let staff change it through a single duration selection that offers every 15-minute value from 30 minutes through 16 hours. The selection SHALL present each option as hours and minutes (for example, 2h 30m). The step SHALL submit the selected duration as decimal hours.

#### Scenario: Default the scheduled duration
- **WHEN** staff reach the class-and-schedule step
- **THEN** the scheduled duration is two hours unless staff change it

#### Scenario: Choose a combined duration
- **WHEN** staff select 2h 30m from the duration selection
- **THEN** the class retains 2.5 hours and submits that value

#### Scenario: Offer only the supported duration range
- **WHEN** staff open the duration selection
- **THEN** the shortest option is 30m and the longest is 16h, at 15-minute steps

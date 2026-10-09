## ADDED Requirements

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

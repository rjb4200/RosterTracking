## ADDED Requirements

### Requirement: Searchable catalog controls offer recently used options first

For the wizard's searchable catalog controls, the system SHALL present the options the current staff member has used most recently in a "Recently used" group before the full catalog, so common choices are reachable without scrolling the entire list. The full-catalog group SHALL also include the recently used options.

#### Scenario: Offer recent curricula
- **WHEN** a staff member opens the Curriculum control after creating or instructing classes that used approved curricula
- **THEN** those curricula appear in a "Recently used" group before the full curriculum list

#### Scenario: Offer recent sites
- **WHEN** a staff member opens the Training site control
- **THEN** their recently used sites appear in a "Recently used" group before the full site list

#### Scenario: Omit the group with no history
- **WHEN** a staff member has no recent classes
- **THEN** the control offers the full catalog without a "Recently used" group

#### Scenario: Ignore curricula outside the catalog
- **WHEN** a recent class recorded a typed curriculum that is not in the approved catalog
- **THEN** that value does not appear in the "Recently used" group

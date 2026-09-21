## ADDED Requirements

### Requirement: Wizard layout stays within the viewport on narrow screens

The system SHALL keep the class creation wizard within the width of its container at narrow mobile viewports and SHALL NOT allow control content, including long course, site, or instructor option labels, to widen the page beyond the viewport. The wizard's step-advance and final-submit controls SHALL remain pointer-reachable while the wizard is displayed on a narrow mobile viewport.

#### Scenario: Long option labels do not widen the page

- **WHEN** a selected or listed course, training site, or instructor has a long name and staff open the wizard on a narrow mobile viewport
- **THEN** the page does not scroll horizontally and the wizard content stays within the viewport width

#### Scenario: Step advance remains pointer-operable

- **WHEN** staff complete the required inputs of a step on a narrow mobile viewport and activate the Next control with a pointer
- **THEN** the wizard advances to the next step

#### Scenario: Final submission remains pointer-operable

- **WHEN** staff reach the review step on a narrow mobile viewport and activate the create control with a pointer
- **THEN** the reviewed class is submitted

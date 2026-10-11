# Page Heading Guidance Specification

## Purpose

Give every staff page the same heading presentation and make the one primary action of a page look the same everywhere, so operators learn the interface once and cannot be misled by a differently styled control that does the same thing.

## Requirements

### Requirement: Staff headings share one presentation primitive

The system SHALL render every staff page heading through a single shared presentation component that supports an eyebrow, a title, optional supporting metadata, and an optional set of actions.

#### Scenario: Render a list page heading
- **WHEN** a staff list page is displayed
- **THEN** its heading is rendered through the shared heading component

#### Scenario: Render a detail or dashboard heading
- **WHEN** a staff detail page, dashboard, or error surface is displayed
- **THEN** its heading is rendered through the same shared heading component

### Requirement: A heading presents at most one primary action

A staff page heading SHALL present at most one primary action, which is the page's main create or advance action; any additional controls SHALL be presented as supporting or navigation actions.

#### Scenario: Heading with a create action
- **WHEN** a staff list page offers a single create action
- **THEN** that action is the heading's only primary action

#### Scenario: Heading with supporting controls only
- **WHEN** a staff detail page offers navigation or status controls but no create action
- **THEN** those controls are presented as supporting or navigation actions and no control is presented as the primary action

### Requirement: Button variants carry fixed meanings

The system SHALL use each button variant for one consistent meaning across staff surfaces: the primary variant for a page's single primary action, the secondary variant for supporting in-page actions, and the outline variant for navigation and other low-emphasis actions.

#### Scenario: Primary create action
- **WHEN** any staff page presents its create action
- **THEN** the create action uses the primary variant

#### Scenario: Supporting action
- **WHEN** a staff surface presents a supporting action such as applying a filter or editing details
- **THEN** that action uses the secondary variant

#### Scenario: Navigation action
- **WHEN** a staff surface presents a navigation action such as returning to a parent list
- **THEN** that action uses the outline variant or a plain link

### Requirement: A page's create action looks the same everywhere

The system SHALL present a page's create action with the primary variant in the heading and SHALL present the matching create action inside that page's empty state with the same primary variant, so the two are visually identical.

#### Scenario: Compare heading and empty-state create actions
- **WHEN** a staff list page offers a create action in its heading and again inside its empty state
- **THEN** both create actions use the primary variant

#### Scenario: Compare two different list pages
- **WHEN** two different staff list pages each offer a create action in their heading
- **THEN** both create actions use the same variant

### Requirement: Hero actions may be sized larger without changing variant

The system SHALL allow a deliberately prominent dashboard action to use a larger size while remaining the primary variant.

#### Scenario: Dashboard hero action
- **WHEN** a dashboard presents a prominent class-creation action
- **THEN** the action uses the primary variant and may use a larger size than a standard heading action

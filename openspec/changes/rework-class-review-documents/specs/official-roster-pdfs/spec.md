## MODIFIED Requirements

### Requirement: Official roster access is controlled

The system SHALL allow Training Majors and Administrators to generate, view, and email official rosters for any finalized revision. The system SHALL allow an instructor to perform those actions only for a revision belonging to a class to which the instructor is assigned. Viewing SHALL present the rendered PDF inline, from which the user may print or download it through the browser; the system SHALL not offer separate print and download actions.

#### Scenario: Permit an assigned instructor
- **WHEN** an instructor requests an official roster for a finalized class to which they are assigned
- **THEN** the system permits the requested roster action

#### Scenario: Prevent unrelated instructor access
- **WHEN** an instructor requests an official roster for a finalized class to which they are not assigned
- **THEN** the system denies access without disclosing generated roster content

#### Scenario: View, print, and download through one action
- **WHEN** authorized staff choose View for a form
- **THEN** the system presents the same rendered PDF inline and the browser provides the print and download workflow

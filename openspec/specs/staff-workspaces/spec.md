# Staff Workspaces Specification

## Purpose

Give staff a focused workspace based on their active account role while retaining shared operational URLs and server-side permission enforcement.

## Requirements

### Requirement: Staff are routed to an account-level workspace
The system SHALL route authenticated staff from `/staff` to `/staff/instructor` when their active role is Instructor and to `/staff/admin` when their active role is Training Major or Administrator. An account with an Administrator or Training Major role SHALL use the Admin workspace even if it also retains an Instructor role.

#### Scenario: Instructor enters the staff area
- **WHEN** an active Instructor requests `/staff` after authentication
- **THEN** the system redirects the user to the Instructor workspace

#### Scenario: Training Major enters the staff area
- **WHEN** an active Training Major requests `/staff` after authentication
- **THEN** the system redirects the user to the Admin workspace

#### Scenario: Administrator enters the staff area
- **WHEN** an active Administrator requests `/staff` after authentication
- **THEN** the system redirects the user to the Admin workspace

### Requirement: Instructor workspace focuses on class operations
The Instructor workspace SHALL prioritize accessible class operations, QR and sign-in workflows, roster editing, finalization, and previously taught classes. It SHALL not expose Admin-only navigation areas.

#### Scenario: Instructor views the workspace
- **WHEN** an Instructor opens the Instructor workspace
- **THEN** the page presents class operations and taught-class history without Admin-only navigation

### Requirement: Admin workspace includes administration and reporting
The Admin workspace SHALL provide access to class operations, reporting, finalized-class administration, and every shared management area for which the staff account has permission.

#### Scenario: Administrator views the workspace
- **WHEN** an Administrator opens the Admin workspace
- **THEN** the page presents reporting and administration navigation in addition to class operations

### Requirement: Shared routes remain compatible and protected
The system SHALL retain existing shared `/staff` operational URLs during the workspace rollout. Workspace navigation SHALL not replace permission checks or domain-specific role checks on pages, actions, or services.

#### Scenario: Direct shared route request
- **WHEN** staff request an existing shared operational URL directly
- **THEN** the system applies its existing authorization rules independent of workspace navigation visibility

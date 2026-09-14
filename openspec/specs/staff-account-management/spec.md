# Staff Account Management Specification

## Purpose

Allow Administrators to create and manage staff accounts and their account-level roles without exposing account administration to other staff roles.

## Requirements

### Requirement: Only Administrators manage staff accounts
The system SHALL allow only an active Administrator to access staff account management, create accounts, assign account roles, change account status, or reset account passwords.

#### Scenario: Administrator opens account management
- **WHEN** an active Administrator opens staff account management
- **THEN** the system allows access and lists staff accounts without password hashes

#### Scenario: Training Major attempts account management
- **WHEN** a Training Major requests a staff account management operation
- **THEN** the system denies the operation even if the interface did not expose the control

### Requirement: New staff accounts receive one selectable role
The system SHALL allow an Administrator to create an active staff account with a normalized unique username, display name, initial password, and exactly one selected role: Instructor, Training Major, or Administrator.

#### Scenario: Create an Instructor account
- **WHEN** an Administrator submits valid details and selects Instructor
- **THEN** the system creates the account with the Instructor role and records an audit event without recording the password

#### Scenario: Reject duplicate username
- **WHEN** an Administrator submits a username already assigned to another account
- **THEN** the system rejects the creation without creating a duplicate account

### Requirement: Account changes invalidate prior sessions
The system SHALL invalidate existing sessions when an Administrator resets a password, changes a staff account's role, or deactivates the account. The system SHALL record the account-management action without storing plaintext passwords.

#### Scenario: Change a staff role
- **WHEN** an Administrator changes a staff account from Instructor to Training Major
- **THEN** the system updates the role, invalidates prior sessions, and records an audit event

#### Scenario: Deactivate a staff account
- **WHEN** an Administrator deactivates a staff account
- **THEN** the account can no longer access protected staff operations and prior sessions are invalidated

## ADDED Requirements

### Requirement: Staff accounts are listed, created, and edited on separate pages

The system SHALL present an Administrator a searchable list of staff accounts showing each account's display name, username, role, account status, and last login, SHALL create an account on a dedicated new-account page, and SHALL edit an account's display name, role, account status, and password on a dedicated per-account page that also offers the archive action and the instructor profile.

#### Scenario: Search the account list
- **WHEN** an Administrator searches the account list by display name or username
- **THEN** only accounts matching the search are listed

#### Scenario: Show the last login
- **WHEN** an Administrator views the account list
- **THEN** each account shows its last login, or none when it has never signed in

#### Scenario: Create on a new-account page
- **WHEN** an Administrator creates a staff account
- **THEN** the account is created from the dedicated new-account page

#### Scenario: Edit on a per-account page
- **WHEN** an Administrator changes an account's display name, role, or account status
- **THEN** the change is saved from that account's page

#### Scenario: Archive from the account page
- **WHEN** an Administrator archives an account from its page
- **THEN** the account is hidden from the account list

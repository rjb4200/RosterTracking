## MODIFIED Requirements

### Requirement: New staff accounts receive one selectable role

The system SHALL allow an Administrator to create an active staff account with a normalized unique username, an optional normalized unique email, display name, initial password, and exactly one selected role: Instructor, Training Major, or Administrator.

#### Scenario: Create an Instructor account
- **WHEN** an Administrator submits valid details and selects Instructor
- **THEN** the system creates the account with the Instructor role and records an audit event without recording the password

#### Scenario: Create an account with an email
- **WHEN** an Administrator submits a valid email with the new account
- **THEN** the system stores it normalized and the account can use it to sign in

#### Scenario: Reject duplicate username
- **WHEN** an Administrator submits a username already assigned to another account
- **THEN** the system rejects the creation without creating a duplicate account

#### Scenario: Reject duplicate email
- **WHEN** an Administrator submits an email already assigned to another account, ignoring case
- **THEN** the system rejects the creation without creating a duplicate account

### Requirement: Account fields and profile fields are maintained separately

The system SHALL treat username, email, display name, role, account status, and password as account-level fields managed through staff account management. The account email SHALL additionally be maintainable by the account owner from their profile. The system SHALL treat instructor credential attributes as profile fields maintained by the profile owner or an Administrator, and SHALL NOT require account-management access to edit a profile.

#### Scenario: Profile edit does not require account management
- **WHEN** an instructor edits their own profile attributes
- **THEN** the system permits the edit without granting access to account management

#### Scenario: Owner maintains the account email
- **WHEN** a staff member edits their own email from their profile
- **THEN** the system saves the account email without requiring account-management access

#### Scenario: Account management does not change profiles implicitly
- **WHEN** an Administrator changes a staff account's role
- **THEN** the system leaves that user's profile attributes unchanged

### Requirement: Staff accounts are listed, created, and edited on separate pages

The system SHALL present an Administrator a searchable list of staff accounts showing each account's display name, username, email, role, account status, and last login, SHALL create an account on a dedicated new-account page, and SHALL edit an account's display name, email, role, account status, and password on a dedicated per-account page that also offers the archive action and the instructor profile.

#### Scenario: Search the account list
- **WHEN** an Administrator searches the account list by display name, username, or email
- **THEN** only accounts matching the search are listed

#### Scenario: Show the last login
- **WHEN** an Administrator views the account list
- **THEN** each account shows its last login, or none when it has never signed in

#### Scenario: Show whether an account has an email
- **WHEN** an Administrator views the account list
- **THEN** each account shows its email or indicates that none is set

#### Scenario: Create on a new-account page
- **WHEN** an Administrator creates a staff account
- **THEN** the account is created from the dedicated new-account page

#### Scenario: Edit on a per-account page
- **WHEN** an Administrator changes an account's display name, email, role, or account status
- **THEN** the change is saved from that account's page

#### Scenario: Archive from the account page
- **WHEN** an Administrator archives an account from its page
- **THEN** the account is hidden from the account list

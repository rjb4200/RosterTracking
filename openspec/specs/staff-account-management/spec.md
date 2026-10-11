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

### Requirement: Account fields and profile fields are maintained separately
The system SHALL treat username, display name, role, account status, and password as account-level fields managed only through staff account management. It SHALL treat instructor credential attributes as profile fields maintained by the profile owner or an Administrator, and SHALL NOT require account-management access to edit a profile.

#### Scenario: Profile edit does not require account management
- **WHEN** an instructor edits their own profile attributes
- **THEN** the system permits the edit without granting access to account management

#### Scenario: Account management does not change profiles implicitly
- **WHEN** an Administrator changes a staff account's role
- **THEN** the system leaves that user's profile attributes unchanged

### Requirement: Administrators archive staff accounts

The system SHALL let an Administrator archive a staff account, hiding it from the account list and preventing sign-in while retaining it for history. The system SHALL refuse to archive the acting Administrator's own account or the last active Administrator. The system SHALL revive an archived account when the same username is created again.

#### Scenario: Archive an account
- **WHEN** an Administrator archives a staff account
- **THEN** the account is hidden from the account list and can no longer sign in

#### Scenario: Refuse to archive the acting Administrator
- **WHEN** an Administrator attempts to archive their own account
- **THEN** the system refuses the archive

#### Scenario: Refuse to archive the last Administrator
- **WHEN** an Administrator attempts to archive the only remaining active Administrator
- **THEN** the system refuses the archive

#### Scenario: Revive on re-create
- **WHEN** an Administrator creates an account whose username matches an archived account
- **THEN** the archived account is revived rather than duplicated

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

### Requirement: Account list distinguishes empty from no matches

The system SHALL present a different empty state when no staff accounts exist than when a search matches no accounts; the no-accounts state SHALL offer the new-account action and the no-matches state SHALL offer to clear the search.

#### Scenario: No accounts yet
- **WHEN** no staff accounts exist
- **THEN** the list explains that no accounts exist yet and offers the new-account action

#### Scenario: No search matches
- **WHEN** a search term matches no staff accounts
- **THEN** the list reports that no accounts match the term and offers to clear the search


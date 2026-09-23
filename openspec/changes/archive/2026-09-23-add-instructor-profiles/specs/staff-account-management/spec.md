## ADDED Requirements

### Requirement: Account fields and profile fields are maintained separately
The system SHALL treat username, display name, role, account status, and password as account-level fields managed only through staff account management. It SHALL treat instructor credential attributes as profile fields maintained by the profile owner or an Administrator, and SHALL NOT require account-management access to edit a profile.

#### Scenario: Profile edit does not require account management
- **WHEN** an instructor edits their own profile attributes
- **THEN** the system permits the edit without granting access to account management

#### Scenario: Account management does not change profiles implicitly
- **WHEN** an Administrator changes a staff account's role
- **THEN** the system leaves that user's profile attributes unchanged

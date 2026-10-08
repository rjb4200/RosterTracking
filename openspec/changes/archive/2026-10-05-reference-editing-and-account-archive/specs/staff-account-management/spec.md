## ADDED Requirements

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

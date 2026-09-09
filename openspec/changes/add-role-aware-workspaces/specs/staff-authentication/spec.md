## MODIFIED Requirements

### Requirement: Staff username and password login
The system SHALL authenticate staff using an administrator-created username and password and SHALL not provide public staff registration. After successful authentication, the system SHALL redirect the user through `/staff` to the workspace determined from the account's active role.

#### Scenario: Valid credentials are submitted
- **WHEN** an active staff user submits the correct normalized username and password
- **THEN** the system creates a staff session and redirects the user through `/staff` to the applicable protected workspace

#### Scenario: Invalid credentials are submitted
- **WHEN** a username is unknown or a password is incorrect
- **THEN** the system rejects the login with the same generic error and does not reveal whether the username exists

#### Scenario: Repeated invalid passwords are submitted
- **WHEN** an account reaches the configured failed-login threshold
- **THEN** further login attempts for that account are temporarily rejected and a successful administrator reset can clear the lock

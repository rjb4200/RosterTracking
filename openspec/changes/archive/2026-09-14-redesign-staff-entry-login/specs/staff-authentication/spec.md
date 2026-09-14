## MODIFIED Requirements

### Requirement: Staff username and password login
The system SHALL authenticate staff using an administrator-created username and password and SHALL not provide public staff registration.

#### Scenario: Valid credentials are submitted
- **WHEN** an active staff user submits the correct normalized username and password from any staff login surface
- **THEN** the system creates a staff session and directs the user through role-aware workspace routing

#### Scenario: Invalid credentials are submitted
- **WHEN** a username is unknown or a password is incorrect
- **THEN** the system rejects the login with the same generic error and does not reveal whether the username exists

#### Scenario: Repeated invalid passwords are submitted
- **WHEN** an account reaches the configured failed-login threshold
- **THEN** further login attempts for that account are temporarily rejected and a successful administrator reset can clear the lock

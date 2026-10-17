## MODIFIED Requirements

### Requirement: Staff username and password login

The system SHALL authenticate staff using an administrator-created credential — either the account username or the account email — together with the account password, and SHALL not provide public staff registration. A submitted identifier that contains `@` SHALL be treated as an email and matched against the account email; any other identifier SHALL be treated as a username. After successful authentication, the system SHALL redirect the user through `/staff` to the workspace determined from the account's active role.

#### Scenario: Valid credentials are submitted with a username
- **WHEN** an active staff user submits the correct normalized username and password from any staff login surface
- **THEN** the system creates a staff session and directs the user through `/staff` to the workspace determined from the account's active role

#### Scenario: Valid credentials are submitted with an email
- **WHEN** an active staff user submits their account email and password from any staff login surface
- **THEN** the system creates the same staff session as a username sign-in

#### Scenario: Email matching ignores case
- **WHEN** a staff user submits their account email with different letter casing
- **THEN** the system still authenticates the account

#### Scenario: Invalid credentials are submitted
- **WHEN** a username or email is unknown or a password is incorrect
- **THEN** the system rejects the login with the same generic error and does not reveal whether the account exists

#### Scenario: Repeated invalid passwords are submitted
- **WHEN** an account reaches the configured failed-login threshold
- **THEN** further login attempts for that account are temporarily rejected and a successful administrator reset can clear the lock

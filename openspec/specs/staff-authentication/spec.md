# Staff Authentication Specification

## Purpose

Allow department staff to use simple persistent username/password accounts while enforcing account status and extensible server-side permissions.

## Requirements

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

### Requirement: Secure password storage
The system SHALL store only memory-hard password hashes and SHALL never return password hashes through application responses, sessions, logs, or browser code.

#### Scenario: Administrator creates an account
- **WHEN** an administrator supplies a valid initial password
- **THEN** the system stores an Argon2id hash rather than the supplied password

### Requirement: Persistent staff session
The system SHALL maintain a successful staff login across browser restarts for up to one year unless the user logs out, the account is disabled, the password is reset, or the session expires.

#### Scenario: Authenticated user returns later
- **WHEN** an active staff user returns with a valid unexpired session cookie
- **THEN** the protected staff area remains available without another login

#### Scenario: User logs out
- **WHEN** an authenticated user invokes logout
- **THEN** the current browser session is invalidated and protected pages require login

#### Scenario: Password is reset
- **WHEN** an administrator resets a staff user's password
- **THEN** sessions created with the prior password version no longer authorize protected operations

### Requirement: Active account enforcement
The system SHALL verify the current database account status before granting protected staff access.

#### Scenario: Account is disabled after login
- **WHEN** a disabled user presents an otherwise valid session
- **THEN** protected access is denied and the user is directed to log in

### Requirement: Permission-based authorization
The system SHALL grant staff capabilities through database-backed role-to-permission assignments and SHALL enforce required permissions on the server.

#### Scenario: User has required permission
- **WHEN** an active authenticated user requests a protected operation and an assigned role grants its required permission
- **THEN** the operation is allowed

#### Scenario: User lacks required permission
- **WHEN** an authenticated user requests a protected operation without its required permission
- **THEN** the system denies the operation regardless of whether the interface exposed its control

### Requirement: Initial administrator bootstrap
The system SHALL provide an explicit command that creates or updates the initial administrator without embedding default credentials in source control.

#### Scenario: Bootstrap runs with valid input
- **WHEN** an operator runs the bootstrap command with a unique username and password supplied outside source control
- **THEN** an active administrator account exists with the administrator role and the password is stored only as a hash

#### Scenario: Bootstrap is rerun
- **WHEN** the bootstrap command is rerun for the same normalized username
- **THEN** it updates that account safely without duplicating the user, role, permission, or assignment records

### Requirement: Authentication audit events
The system SHALL record security-relevant staff account changes and successful authentication events without storing plaintext passwords or authentication secrets.

#### Scenario: Staff login succeeds
- **WHEN** a staff user authenticates successfully
- **THEN** an audit event records the actor, action, and server timestamp without recording the password

#### Scenario: Staff account is bootstrapped or reset
- **WHEN** an operator creates, disables, unlocks, or resets a staff account
- **THEN** an audit event records the action and affected user without recording credential material

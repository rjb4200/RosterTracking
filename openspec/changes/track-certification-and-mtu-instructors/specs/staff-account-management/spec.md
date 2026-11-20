# Spec Delta

## ADDED Requirements

### Requirement: Staff accounts can be designated MTU instructors

The system SHALL let only an Administrator set or clear an MTU instructor designation on a staff account, from account creation or that account's page. The designation SHALL default off and SHALL NOT grant any role or permission by itself.

#### Scenario: Designate at creation

- **WHEN** an Administrator creates a staff account with the MTU instructor designation selected
- **THEN** the account records the MTU instructor designation

#### Scenario: Designate an existing account

- **WHEN** an Administrator selects the MTU instructor designation for an existing staff account and saves
- **THEN** the account records the MTU instructor designation

#### Scenario: Clear the designation

- **WHEN** an Administrator clears an existing account's MTU instructor designation and saves
- **THEN** the account no longer records the MTU instructor designation

#### Scenario: Default off

- **WHEN** an Administrator creates a staff account without selecting the MTU instructor designation
- **THEN** the account does not record the MTU instructor designation

#### Scenario: Deny a non-Administrator

- **WHEN** a staff member who is not an Administrator attempts to change an account's MTU instructor designation
- **THEN** the system denies the change

#### Scenario: Leave role and access unchanged

- **WHEN** an Administrator changes an account's MTU instructor designation
- **THEN** the account's role and permissions are unchanged

#### Scenario: Preserve the designation across other edits

- **WHEN** an Administrator changes an account's display name, email, role, status, or password
- **THEN** the MTU instructor designation is unchanged

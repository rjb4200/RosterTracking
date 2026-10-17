# Staff Email Specification

## Purpose
Give each staff account an optional email that its owner or an Administrator can maintain, used as the address of record for account-addressed notifications, and prompted for when absent.

## Requirements
### Requirement: Staff accounts carry an optional email

The system SHALL store an optional email on each staff account. A stored email SHALL be trimmed and case-normalized, SHALL be validated as an email address, and SHALL be unique across accounts case-insensitively. An account without an email SHALL remain valid, and an email SHALL be removable.

#### Scenario: Store a valid email
- **WHEN** an account email is set to a valid address
- **THEN** the system stores it normalized and it can be used as a login identifier

#### Scenario: Reject a duplicate email
- **WHEN** an email is set that another account already holds, ignoring case
- **THEN** the system rejects the change and stores no duplicate

#### Scenario: Reject an invalid email
- **WHEN** an email is set that is not a valid address
- **THEN** the system rejects the change

#### Scenario: Leave an account without an email
- **WHEN** an account is created without an email
- **THEN** the account is valid and can still sign in with its username

### Requirement: The account owner maintains their email

The system SHALL let the account owner add or change their own email from their profile without account-management access, and SHALL let an Administrator set or change any account's email from account management. A change SHALL be recorded in the account audit trail.

#### Scenario: Owner sets their email
- **WHEN** a staff member supplies their own email on their profile
- **THEN** the system saves it without requiring account-management access

#### Scenario: Administrator sets another account's email
- **WHEN** an Administrator sets an email on another staff account
- **THEN** the system saves it and records the change

### Requirement: The staff area prompts an account without an email

The staff area SHALL present a prominent prompt band to a signed-in staff member whose account has no email, telling them to add one and linking to their profile. The band SHALL render full-bleed directly beneath the staff header, above the section navigation, SHALL use the department's signal palette with centered copy and an alert emphasis, and SHALL include a primary add-email call to action and a dismiss control. The band SHALL appear for every staff role and SHALL no longer appear once an email is stored. A dismissal SHALL apply only to the current sign-in: the band SHALL stay hidden for the remainder of that sign-in and SHALL return on the next successful sign-in while the account still has no email.

#### Scenario: Account has no email
- **WHEN** a signed-in staff member without an email opens a staff page
- **THEN** the staff area shows the prompt band beneath the header

#### Scenario: Present the band as a full-bleed notice
- **WHEN** the prompt band is shown
- **THEN** it spans the full width beneath the staff header, uses the signal palette, centers its message, and offers both the add-email action and a dismiss control

#### Scenario: Dismiss the band for the current sign-in
- **WHEN** the member dismisses the prompt band
- **THEN** the band is hidden for the remainder of the current sign-in

#### Scenario: The dismissal resets on the next sign-in
- **WHEN** the member signs in again while their account still has no email, even after dismissing the band previously
- **THEN** the prompt band is shown again

#### Scenario: Prompt clears after adding an email
- **WHEN** the member adds an email from their profile
- **THEN** the prompt no longer appears, whether or not it was dismissed

### Requirement: The account email is the reminder address of record

The system SHALL use the account's stored email as the address for account-addressed notifications, including class finalization reminders. When the email changes, later notifications SHALL use the new address.

#### Scenario: Reminder uses the account email
- **WHEN** an account-addressed notification is prepared for a staff member
- **THEN** the message is addressed to that account's stored email

#### Scenario: A changed email is used afterward
- **WHEN** a staff member changes their email and a later notification is prepared
- **THEN** the message is addressed to the new email

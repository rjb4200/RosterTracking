## ADDED Requirements

### Requirement: Staff configure optional student access PINs
The class creation and editing workflow SHALL let authorized staff enable or disable a student access PIN before a class is opened. PIN protection SHALL default to disabled. When enabled, the system SHALL generate a four-digit numeric PIN; staff SHALL NOT choose the value manually.

#### Scenario: Create a class without a PIN
- **WHEN** authorized staff create a class without enabling PIN protection
- **THEN** the class opens without requiring students to enter a PIN

#### Scenario: Enable PIN protection before opening
- **WHEN** authorized staff enable PIN protection for a draft class
- **THEN** the system generates a four-digit numeric PIN and requires it for public student access after the class opens

### Requirement: Authorized instructors can view enabled class PINs
The system SHALL display the current four-digit student access PIN only to authorized instructors for the associated open class. The system SHALL stop displaying the PIN when the class leaves the open state.

#### Scenario: View an enabled PIN during an open class
- **WHEN** an authorized instructor views an open class with PIN protection enabled
- **THEN** the instructor can view the current four-digit numeric PIN

#### Scenario: Hide PIN after class closure
- **WHEN** a class leaves the open state
- **THEN** the student access PIN is not displayed to staff or public visitors

# Spec Delta

## ADDED Requirements

### Requirement: Classes record whether an internal certificate is issued

The system SHALL let staff set an internal-certificate flag on a class that controls whether the automatic certificate batch is sent. The flag SHALL default to on, SHALL be editable while the class is open, and SHALL NOT by itself prevent an authorized staff member from sending a certificate to an individual participant.

#### Scenario: Default the flag on

- **WHEN** staff create a class
- **THEN** the class's internal-certificate flag is on

#### Scenario: Turn automatic certificates off

- **WHEN** staff clear the internal-certificate flag on an open class and save
- **THEN** the class records that internal certificates are not issued automatically

#### Scenario: Turn automatic certificates on

- **WHEN** staff set the internal-certificate flag on an open class and save
- **THEN** the class records that internal certificates are issued automatically

#### Scenario: Keep the flag editable while open

- **WHEN** staff change the internal-certificate flag on an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Require reopening after finalization

- **WHEN** a class is finalized
- **THEN** its internal-certificate flag is not editable until the class is reopened

### Requirement: Finalization freezes the class certificate facts

The system SHALL preserve the class's internal-certificate flag and the applicable external certificate issuer in the finalized revision. The applicable issuer SHALL be the selected EMS category's issuer when the class has one, otherwise the first selected Fire subject's issuer. The frozen values SHALL NOT change when the class or its category changes later.

#### Scenario: Freeze the internal-certificate flag

- **WHEN** a class is finalized
- **THEN** the revision retains the internal-certificate flag that was set at finalization

#### Scenario: Freeze the external issuer

- **WHEN** an EMS class whose category has an AHA external issuer is finalized
- **THEN** the revision retains AHA as its external certificate issuer

#### Scenario: Later change does not rewrite history

- **WHEN** a class's flag or its category's external issuer changes after finalization
- **THEN** the existing revision keeps the values captured at finalization

### Requirement: Instructor options identify MTU instructors

The system SHALL identify which instructor options are designated MTU instructors when staff choose a class's lead or assistant instructor.

#### Scenario: Mark a designated MTU instructor

- **WHEN** staff open the class instructor selector and an option is a designated MTU instructor
- **THEN** that option is identified as an MTU instructor

#### Scenario: Leave other instructors unmarked

- **WHEN** staff open the class instructor selector and an option is not a designated MTU instructor
- **THEN** that option is not identified as an MTU instructor

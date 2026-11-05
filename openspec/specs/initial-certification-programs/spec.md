# initial-certification-programs Specification

## Purpose
Defines the fixed EMR, EMT-B, and AEMT initial-certification programs and their training-hour requirements so KBEMS classes use the correct program and category.

## Requirements

### Requirement: Fixed initial-certification programs

The system SHALL define fixed initial-certification programs for EMR (40 hours), EMT-B (160 hours), and AEMT (190 hours). Each program SHALL have one fixed EMS category that is offered only when the course type is Initial certification.

#### Scenario: Offer the fixed programs

- **WHEN** staff choose Initial certification for a KBEMS class
- **THEN** the system offers only EMR, EMT-B, and AEMT with their fixed hours

#### Scenario: Hide program categories from continuing education

- **WHEN** staff choose Continuing education or Refresher
- **THEN** the initial-certification program categories are not offered

#### Scenario: Keep the program hours fixed

- **WHEN** staff select an initial-certification program
- **THEN** its hours cannot be changed through the duration picker

### Requirement: Selecting a program fills its class details

Selecting an initial-certification program SHALL set the class's EMS category to that program's fixed category and the EMS course name to the program title. The course number SHALL remain the separately entered initial-certification number.

#### Scenario: Autofill from the program

- **WHEN** staff select EMT-B
- **THEN** the EMS category is the EMT-B category, the course name is EMT-B, and the program hours are 160

#### Scenario: Keep the course number separate

- **WHEN** staff select a program
- **THEN** the initial-certification course number is not replaced by the program selection

### Requirement: An initial-certification program spans days without daily sessions

An initial-certification class SHALL be KBEMS-only and SHALL store one program block whose credited hours equal the program hours. The program block SHALL be allowed to span multiple department-calendar days, and the class SHALL remain open until it is finalized. The program hours SHALL be the class total, the default attendance credit, the certificate hours, and the transcript hours.

#### Scenario: Create a multi-week program class

- **WHEN** staff create an AEMT initial-certification class starting on a Monday
- **THEN** the class stores one AEMT program block of 190 hours and may span several weeks

#### Scenario: Use program hours for credit

- **WHEN** a participant signs in to an initial-certification program class
- **THEN** the default credited hours equal the program hours

#### Scenario: Use program hours on certificates and transcripts

- **WHEN** an initial-certification program class is finalized
- **THEN** the certificate and transcript use the program hours

#### Scenario: Reject a Fire combination

- **WHEN** staff select Fire together with an initial-certification program
- **THEN** the system blocks the combination and explains that initial-certification programs are KBEMS-only

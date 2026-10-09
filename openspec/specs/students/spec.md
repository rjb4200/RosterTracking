# Students Specification

## Purpose

Provide durable, searchable student and agency records with many-to-many memberships so later class and sign-in phases can look up and manage training participants.

## Requirements

### Requirement: Student record management
The system SHALL store one primary record per student with a normalized unique phone number, an email address, and an optional unique internal number, and SHALL let authorized staff create, edit, and deactivate students. A student created or confirmed through sign-in going forward SHALL hold an email address; the email is required so the student can receive their completion certificate.

#### Scenario: Create a student
- **WHEN** authorized staff create a student with a first name, last name, phone number, and email
- **THEN** the system stores the student with a server-generated id, normalized phone, and email and records an audit event

#### Scenario: Require an email
- **WHEN** a student is created without an email
- **THEN** the system rejects the create and reports a missing-email error

#### Scenario: Duplicate phone number
- **WHEN** a student is created with a phone number already in use
- **THEN** the system rejects the create and reports a duplicate-phone error

#### Scenario: Deactivate a student
- **WHEN** authorized staff deactivate a student
- **THEN** the student is hidden from active lookups without deleting their historical records

### Requirement: Student agency memberships
The system SHALL allow a student to belong to multiple agencies and SHALL enforce at most one active primary agency per student. Memberships SHALL represent a student's preferred agencies for sign-in and SHALL NOT limit the active agencies a regular student may represent for a class.

#### Scenario: Assign multiple agencies
- **WHEN** authorized staff link a student to more than one active agency
- **THEN** the memberships are stored independently with no duplication of the student record

#### Scenario: Set a primary agency
- **WHEN** a membership is marked primary and another active primary membership exists for the same student
- **THEN** the system keeps only one active primary membership for that student

#### Scenario: Represent an agency outside memberships
- **WHEN** a regular student selects an active agency they do not belong to
- **THEN** the system accepts the selection for the class and does not reject attendance solely because a membership is missing

### Requirement: Student search and lookup
The system SHALL allow authorized staff to search students by name or phone without exposing credential values.

#### Scenario: Search by name
- **WHEN** authorized staff search students by a name fragment
- **THEN** matching active students are returned with their agencies but without full credential values

### Requirement: Student audit events
The system SHALL record audit events when a student is created or their core information or memberships change.

#### Scenario: Student is updated
- **WHEN** authorized staff change a student's name, phone, or membership
- **THEN** an audit event records the actor, entity, and server timestamp without credential material

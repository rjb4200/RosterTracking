# Staff Entry Experience Specification

## Purpose

Give each public user type a clear, appropriate path into class attendance or the staff workflows without weakening role-based access control.

## Requirements

### Requirement: Public entry paths are clearly distinguished
The system SHALL present separate public entry points for Instructor access and Training Administration access, and SHALL state that student attendance begins from a class-specific QR code supplied by an instructor.

#### Scenario: Visitor opens the public landing page
- **WHEN** a visitor opens the public landing page
- **THEN** the page presents distinct Instructor and Training Administration entry points and explains the class-QR requirement for student attendance

#### Scenario: Visitor selects Instructor access
- **WHEN** a visitor selects Instructor access from the public landing page
- **THEN** the system opens the Instructor login surface

#### Scenario: Visitor selects Training Administration access
- **WHEN** a visitor selects Training Administration access from the public landing page
- **THEN** the system opens the administrative login surface

### Requirement: Staff login surfaces communicate their workflow
The system SHALL provide semantically and visually distinct login surfaces for class operations and training administration while requesting the same username and password credentials.

#### Scenario: Instructor opens the Instructor login surface
- **WHEN** an Instructor opens the Instructor login surface on a mobile, tablet, or desktop device
- **THEN** the surface presents a focused class-operations login experience with usable responsive form controls

#### Scenario: Administrator opens the administrative login surface
- **WHEN** a Training Major or Administrator opens the administrative login surface
- **THEN** the surface presents a conventional training-administration login experience

### Requirement: Legacy staff login access remains available
The system SHALL retain a compatible response for visitors using the existing `/staff/login` address during the entry-surface migration.

#### Scenario: Visitor opens the legacy staff login address
- **WHEN** a visitor opens `/staff/login`
- **THEN** the system redirects or guides the visitor to the new staff entry experience without bypassing authentication

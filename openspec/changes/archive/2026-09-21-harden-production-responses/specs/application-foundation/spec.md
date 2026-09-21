## ADDED Requirements

### Requirement: Hardened production responses
The system SHALL send a documented set of security response headers on every production response, covering a content security policy, HTTP strict transport security, a frame-ancestors restriction, a nosniff content-type restriction, a referrer policy, and a permissions policy. It SHALL NOT disclose the framework or server version in any response.

#### Scenario: Public responses are hardened
- **WHEN** any public page, sign-in route, or public API route is requested in a production deployment
- **THEN** the response carries the documented security headers

#### Scenario: Staff responses are hardened
- **WHEN** any staff page or staff API route is requested in a production deployment
- **THEN** the response carries the documented security headers

#### Scenario: Version disclosure is removed
- **WHEN** any response is produced
- **THEN** it does not identify the framework or server version

#### Scenario: The hardened policy still serves the application
- **WHEN** the content security policy is applied
- **THEN** the application's own scripts, styles, images, and fonts load, and the staff and public student sign-in journeys complete without a policy violation

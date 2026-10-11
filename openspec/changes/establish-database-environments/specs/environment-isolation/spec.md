## Purpose

Keep non-production deployments visibly and technically separate from the live application, so development links, cookies, and email never reach production or real recipients.

## ADDED Requirements

### Requirement: The development environment has a stable, distinct origin
The development environment SHALL be served at a stable origin that is different from the production origin, so QR codes, cookies, and emailed links generated during development stay valid across releases and never resolve to production.

#### Scenario: Development is served at its own origin
- **WHEN** the development environment is inspected
- **THEN** it is served at a stable origin distinct from the production origin

#### Scenario: Generated links use the development origin
- **WHEN** a class sign-in QR code or link is generated in the development environment
- **THEN** it points at the development origin and not the production origin

#### Scenario: Links survive a redeployment
- **WHEN** the development environment is redeployed
- **THEN** previously generated development links and QR codes still resolve to the development origin

### Requirement: Development never embeds or trusts the production origin
When the application is not running in the production environment, it SHALL derive its own origin from its own configuration and SHALL NOT substitute or trust the production domain as its own.

#### Scenario: Sign-in base URL avoids the production domain
- **WHEN** the application computes the base URL for a generated sign-in link outside production
- **THEN** it uses the environment's own configured origin and never the production domain

#### Scenario: Production origin is not trusted outside production
- **WHEN** a sign-in mutation is validated outside the production environment
- **THEN** the production domain is not accepted as a trusted origin

### Requirement: Development does not send live email
The development environment SHALL NOT deliver email to real recipients through the production sender; email delivery in development SHALL be disabled or directed to a non-production destination.

#### Scenario: No live recipient is emailed from development
- **WHEN** a development action would send email
- **THEN** no message is delivered from the production sender to a real recipient

#### Scenario: Delivery outcome is still recorded
- **WHEN** email is suppressed in development
- **THEN** the delivery attempt is recorded as skipped rather than silently dropped

### Requirement: A single environment discriminator governs cross-environment identity
The application SHALL determine whether it is the live environment from the deployment environment rather than from the build mode, so preview and development deployments never present themselves as, or trust, the production origin.

#### Scenario: Preview is recognized as non-live
- **WHEN** the application runs in a preview deployment
- **THEN** it treats itself as non-production when choosing its link origin and trusted origins

#### Scenario: Build mode alone does not imply live
- **WHEN** the application is built in its production build mode but deployed to a non-production environment
- **THEN** it does not treat itself as the live environment

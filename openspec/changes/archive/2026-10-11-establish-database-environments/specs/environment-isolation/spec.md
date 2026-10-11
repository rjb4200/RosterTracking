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

### Requirement: Email delivery is environment-scoped
The production environment SHALL deliver email through the verified production sender. The development environment MAY deliver email so test messages can be exercised during development, and when it does it SHALL use the shared recorded-delivery path so every attempt has a visible outcome.

#### Scenario: Production delivers through the verified sender
- **WHEN** the application sends email in production
- **THEN** it uses the verified production sender and records the delivery

#### Scenario: Development delivery is recorded
- **WHEN** a development action sends email
- **THEN** the delivery attempt is recorded with its outcome rather than dropped silently

### Requirement: A single environment discriminator governs cross-environment identity
The application SHALL determine whether it is the live environment from the deployment environment rather than from the build mode, so preview and development deployments never present themselves as, or trust, the production origin.

#### Scenario: Preview is recognized as non-live
- **WHEN** the application runs in a preview deployment
- **THEN** it treats itself as non-production when choosing its link origin and trusted origins

#### Scenario: Build mode alone does not imply live
- **WHEN** the application is built in its production build mode but deployed to a non-production environment
- **THEN** it does not treat itself as the live environment

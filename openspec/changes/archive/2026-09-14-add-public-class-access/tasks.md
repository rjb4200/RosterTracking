## 1. Data and Access Services

- [x] 1.1 Add class persistence fields and migration for unique stable public codes, PIN-enabled state, and protected numeric PIN values.
- [x] 1.2 Add public-code generation with unambiguous uppercase characters, collision retries, and canonical short-URL construction.
- [x] 1.3 Add PIN generation, protected storage, authorized retrieval, and validation that preserves leading zeroes.
- [x] 1.4 Add a minimal public open-class query that returns only card-safe course, next-session, location, instructor-display, and short-URL data.
- [x] 1.5 Extend class-access services to resolve short codes, provision codes for legacy open classes, and preserve existing raw-token resolution.

## 2. Student Public Access

- [x] 2.1 Implement the root-level public-code route without intercepting existing static application routes and return generic unavailable responses for unknown or inactive codes.
- [x] 2.2 Route short-code and legacy-token entry through shared class-state validation and PIN-gate handling before workflow context creation.
- [x] 2.3 Add the four-digit numeric PIN prompt and validation flow, excluding PIN values from URLs, telemetry, logs, and public responses.
- [x] 2.4 Update QR URL generation so new and provisioned class QR codes encode the stable short URL.

## 3. Staff and Public Interfaces

- [x] 3.1 Add the optional PIN-protection control to class creation and draft editing, defaulted to disabled and generating the PIN only when enabled.
- [x] 3.2 Update authorized open-class access material to display the stable short URL, stable QR code, and enabled numeric PIN, including legacy-code provisioning.
- [x] 3.3 Replace the landing-page status card with a responsive public directory of open class cards, student sign-in actions, and expandable QR codes.

## 4. Verification

- [x] 4.1 Add service and integration coverage for public-code uniqueness, open-state enforcement, legacy raw-token compatibility, and PIN validation including leading zeroes.
- [x] 4.2 Add end-to-end coverage for the public directory, short URL, QR target, PIN-protected access, and unauthorized/inactive-class behavior.
- [x] 4.3 Run linting, type checking, production build, and the relevant integration and end-to-end test suites.

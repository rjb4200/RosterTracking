## Why

Open classes now have secure public entry links, but students still cannot identify themselves or record attendance. Phase 5 turns that entry boundary into a mobile-first sign-in workflow while protecting student data from enumeration and preserving the facts required for later roster finalization.

## What Changes

- Add regular student identification through remembered devices, normalized phone lookup, and changed-number recovery using the prior phone plus an existing FFN or KEMSIS ID.
- Add secondary guest sign-in when no regular student record can be used, without silently creating a permanent student.
- Resolve the class reporting systems' current requirement sets and collect any missing student fields or credentials before attendance confirmation.
- Let students select the agency represented for this class and record the approved short class-specific attendance attestation.
- Persist attendance, attestation, sign-in method, selected agency, and relevant request metadata in one idempotent transaction.
- Add hashed remembered-device tokens, rate-limited exact-match recovery, generic failure responses, and sanitized logging for public sign-in operations.
- Extend an open class token from a generic context check into the public student sign-in workflow while retaining generic unavailable responses for invalid or inactive classes.
- Add mobile-focused unit, integration, and Playwright coverage for every supported regular and guest pathway.

## Capabilities

### New Capabilities
- `student-identification`: Public student recognition, remembered devices, phone lookup and changed-number recovery, reporting-requirement completion, and enumeration protection.
- `attendance-sign-in`: Regular and guest attendance capture, agency selection, class-specific attestation, idempotent submission, and retained sign-in facts.

### Modified Capabilities
- `class-sign-in-access`: A valid open-class token now presents and maintains the student sign-in context instead of stopping at a placeholder response.

## Impact

- Adds remembered-device, attendance, guest-participant, attestation, and idempotency storage with additive migrations and audit-safe constraints.
- Extends the public `/sign-in/[token]` route into a multi-step mobile workflow and adds secure cookie handling for remembered students.
- Adds student identification, reporting-requirement, attendance, request-metadata, and public rate-limit services.
- Uses existing students, agencies, credentials, reporting requirements, open classes, and hashed class tokens.
- Defers instructor roster editing, credited-hour adjustments, class completion validation, finalization, reporting submission, and official PDF generation to later phases.

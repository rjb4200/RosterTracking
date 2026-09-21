## Why

Every response the application sends currently carries no security headers at all — there is no `middleware.ts` and no header configuration anywhere. Browsers are therefore free to frame the staff and sign-in pages, sniff content types, and leak referrers, and nothing constrains where the application may load scripts, styles, or fonts from. This is the one part of the Phase 9 hardening epic that is fully known and self-contained, so it is split out to ship on its own rather than waiting behind the review program.

## What Changes

- Send a documented set of security headers on every response: a content security policy, HTTP strict transport security, a frame-ancestors restriction, a nosniff content-type restriction, a referrer policy, and a permissions policy.
- Keep the content security policy compatible with the application's own assets and journeys, so the staff and public student sign-in flows complete without a policy violation.
- Add an automated check that the headers are present on a public response and a staff response.
- Leave framework and server version disclosure disabled, as it already is.

## Capabilities

### New Capabilities
<!-- None: this hardens responses the existing foundation already serves. -->

### Modified Capabilities
- `application-foundation`: production responses carry a documented set of security headers and disclose no framework or server version.

## Impact

- **Configuration**: `next.config.ts` gains a header rule; the header set is defined in a small testable module rather than inline.
- **No middleware**: the policy is static and does not vary per request, so it does not justify the runtime cost of a middleware layer. A nonce-based policy would need one and is deliberately deferred.
- **No schema change** and no migration.
- **Risk**: a content security policy can break the application. The policy is exercised against the real journeys, and the spec makes that a requirement rather than an assumption.
- **Related work**: this was task group 3 of `phase-9-production-hardening`; that change keeps the review program, failure reporting, recovery proof, and PDF verification.

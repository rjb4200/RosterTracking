## Context

See `proposal.md` - Why. The constraints that shape the approach:

- `next.config.ts` sets only `allowedDevOrigins`, `outputFileTracingIncludes`, and `poweredByHeader: false`. There is no `headers()` rule and no `middleware.ts`.
- The application serves staff pages under `/staff`, public sign-in under `/sign-in` and `/[code]`, staff APIs under `/api/staff`, and authentication under `/api/auth`.
- The class page renders its sign-in QR code as a `data:` URL image, and the sign-in record and official roster routes return PDFs.
- The Next.js App Router injects inline bootstrap scripts and inline styles, and Tailwind emits inline style attributes.
- Development mode needs `'unsafe-eval'` for scripts and a websocket connection for HMR.
- `poweredByHeader: false` already removes `X-Powered-By`.

## Goals / Non-Goals

**Goals:**
- Every response carries the documented header set.
- The policy does not break the staff or public student sign-in journeys.
- The header set is defined once and can be checked without booting the application.

**Non-Goals:**
- A nonce-based content security policy, which requires middleware and a per-request policy.
- Changing authentication, authorization, or rate limiting.
- Adding failure reporting or telemetry, which stays in the Phase 9 epic.

## Decisions

**Define the header set in a module and apply it from `next.config.ts`.**
A pure function returning the header list is unit-testable and keeps the policy reviewable in one place. *Alternative considered:* inline the array in `next.config.ts` — rejected because it cannot be checked without booting Next.

**Keep the policy static in configuration rather than moving it into middleware.**
The policy does not vary per request, so middleware would add runtime cost and a failure mode for no benefit. The cost of this choice is that the policy cannot use nonces. *Alternative considered:* a nonce-based policy via middleware — deferred and recorded as the follow-up that would tighten `script-src`.

**Allow inline scripts and styles.**
Next injects inline bootstrap scripts and inline styles, and Tailwind emits inline style attributes. Without nonces, `'unsafe-inline'` is required for both or the application breaks. This is the honest limitation of the no-middleware choice, so it is recorded rather than hidden.

**Add development-only allowances conditionally.**
`'unsafe-eval'` and websocket connections are added only when not in production, so HMR keeps working while the production policy stays tighter. *Alternative considered:* one policy for both — rejected because a policy strict enough for production breaks HMR, and one loose enough for HMR is pointless in production.

**Allow `data:` and `blob:` for images where the application already uses them.**
The class sign-in QR code is a `data:` URL, so `img-src` must permit it.

**Assert the headers on a real response, not only in the module.**
A unit test proves the set; an end-to-end check proves the configuration actually applies it to a public and a staff response. Either alone can pass while the feature is broken.

## Risks / Trade-offs

- **A content security policy can silently break a journey.** → Exercise staff sign-in, the class page, and public student sign-in against the policy, and keep the "still serves the application" scenario as the acceptance check.
- **`'unsafe-inline'` in `script-src` weakens XSS protection.** → Recorded explicitly, with the nonce-based policy as the follow-up. The remaining directives (`frame-ancestors`, `object-src`, `base-uri`, `form-action`) still hold.
- **A development-only branch can drift from production.** → The unit test asserts both environments, pinning the difference.
- **Strict transport security on a non-HTTPS origin would be wrong.** → It is sent only in production, where the deployment is served over HTTPS.

## Migration Plan

Additive configuration. No schema change and no migration. If a header breaks a journey, the rule can be removed on its own without any data implication.

## Open Questions

- Whether to adopt a nonce-based policy through middleware later. This does not change the specs or the approach here; it is the recorded follow-up.

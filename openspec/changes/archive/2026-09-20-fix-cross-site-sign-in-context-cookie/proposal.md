## Why

Students arriving from a phone's camera, a messaging app, or any other external
app cannot sign in with their phone number: the sign-in context cookie is set on
the entry route's **307 redirect**, and browsers discard a `SameSite=Lax` cookie
that a cross-site navigation sets. The first mutation then finds no context and
returns "Class sign-in unavailable". Production diagnostics confirm it — after a
cross-site `/H4CX` entry, the first POSTs carry `hasCookieHeader: false,
cookieCount: 0`, and later POSTs carry three unrelated cookies while
`contextCookieCount` stays `0`. Guest sign-in works on the same device because by
then `/sign-in` is first-party and a fresh navigation re-mints the cookie.

The main student pathway has therefore never worked for students who scan a QR
code, which is the primary way students are expected to reach the app.

## What Changes

- The class entry routes (`/[code]`, `/sign-in/[token]`, and the PIN step) stop
  setting the sign-in context cookie. They carry the resolved class and token
  version to `/sign-in` through a short-lived, first-party-safe channel instead
  of a cross-site `Set-Cookie`.
- `/sign-in` mints the sign-in workflow and sets the context cookie on a
  **first-party GET response**, where browsers reliably store it.
- The context cookie keeps `HttpOnly`, `Secure` in production, `SameSite=Lax`,
  `Path=/sign-in`, and the existing 20-minute lifetime. No cookie attribute is
  weakened.
- Entry failures (unknown code, closed class, PIN required, rate limited) keep
  their current behaviour: the student still lands on the generic unavailable
  response without class detail.
- The remembered-device path continues to work from `/sign-in`, since recognition
  already happens there.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-sign-in-access`: the entry routes no longer establish the sign-in
  context cookie; the requirement that stable public access leads to a usable
  sign-in session is met by minting context on the first-party `/sign-in` GET.
- `public-sign-in-reliability`: the sign-in context is established on a
  first-party response so it survives a cross-site arrival, and a cross-site
  entry followed by a phone lookup succeeds.

## Impact

- `src/app/[code]/route.ts` — stops creating the workflow and setting the cookie;
  redirects with a class reference instead.
- `src/app/sign-in/[token]/route.ts` — same change for raw-token links.
- `src/app/sign-in/pin/[code]/actions.ts` — the PIN step hands off the same way.
- `src/app/sign-in/page.tsx` — mints the workflow and sets the context cookie on
  the first-party GET, including the remembered-device recognition path.
- `src/modules/student-sign-in/` — context minting and the entry hand-off; the
  cookie options, TTL, and signing are unchanged.
- Tests: unit coverage for the hand-off and its failure modes, plus an E2E test
  that arrives from an external origin so a cross-site regression is caught.

## 1. Page-side context minting

- [x] 1.1 Resolve the class from the request first-party on `/sign-in`, accepting an open public code or a valid raw token
- [x] 1.2 Reuse a valid, unexpired context for the same class instead of minting a new one
- [x] 1.3 Mint the sign-in workflow and set the context cookie on the page GET response
- [x] 1.4 Apply the workflow-creation and staging rate limits on the page GET, recording a failure when a limit denies
- [x] 1.5 Preserve the remembered-device recognition path, including clearing an unidentifiable remembered cookie
- [x] 1.6 Return the generic unavailable response when no open class can be resolved, without class detail

## 2. Entry route hand-off

- [x] 2.1 Redirect `/[code]` to `/sign-in` carrying the public code, without creating a workflow or issuing the context cookie
- [x] 2.2 Redirect `/sign-in/[token]` to `/sign-in` carrying the token reference, without issuing the context cookie
- [x] 2.3 Redirect the successful PIN step to `/sign-in` carrying the public code, without issuing the context cookie
- [x] 2.4 Clear any legacy context cookie on the entry redirects
- [x] 2.5 Keep unknown-code, inactive-class, PIN-required, and rate-limited outcomes on the generic unavailable response

## 3. Verification

- [x] 3.1 Unit test: a page GET with no context mints one and sets the cookie with unchanged attributes
- [x] 3.2 Unit test: a page GET with a valid context for the same class reuses it
- [x] 3.3 Unit test: a page GET that cannot resolve an open class returns the generic unavailable response
- [x] 3.4 Unit test: the entry routes no longer issue the context cookie
- [x] 3.5 Integration test: entry then page GET then phone lookup together produce a usable context
- [x] 3.6 E2E test: arriving from an external origin and signing in with a known phone number reaches confirmation
- [x] 3.7 Run lint, typecheck, unit tests, integration tests, and build

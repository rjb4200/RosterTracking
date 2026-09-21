## 1. Failure classification

- [x] 1.1 Add `OriginRejectedError` and `MissingSignInContextError` with explicit `name` values
- [x] 1.2 Throw the origin error instead of the plain `Error` in `requestContext()`
- [x] 1.3 Throw the context error instead of the plain `Error` in `requestContext()`

## 2. Trusted origins

- [x] 2.1 Accept the configured canonical origin in `isSameOriginRequest`
- [x] 2.2 Accept the request's own origin
- [x] 2.3 Accept the deployment project production domain
- [x] 2.4 Keep rejecting a request with no origin header
- [x] 2.5 Keep rejecting an origin that matches no trusted origin

## 3. Verification

- [x] 3.1 Unit test: a rejected origin classifies distinctly from the generic case
- [x] 3.2 Unit test: a missing context classifies distinctly from the generic case
- [x] 3.3 Unit test: each trusted origin is accepted
- [x] 3.4 Unit test: no-origin and untrusted-origin are rejected
- [x] 3.5 Confirm student-visible responses are unchanged
- [x] 3.6 Run lint, typecheck, unit tests, and build

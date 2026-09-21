## 1. Containment

- [x] 1.1 Add an `error.tsx` for the `/sign-in` route tree with a generic message and retry
- [x] 1.2 Add an `error.tsx` for the staff protected route tree
- [x] 1.3 Confirm boundaries never render internal error details

## 2. Public guards

- [x] 2.1 Wrap `submitAccessPin` in the generic-failure shape
- [x] 2.2 Guard the `[token]` and `[code]` entry routes
- [x] 2.3 Guard the public sign-in actions that currently swallow failures silently
- [x] 2.4 Verify every failure path returns the generic unavailable response

## 3. Observability

- [x] 3.1 Emit structured failure logs with correlation id, class id when known, and failure kind
- [x] 3.2 Extend the sanitizer to reject phone-like and credential-like values
- [x] 3.3 Confirm no tokens, phones, or credential values appear in logs

## 4. Key health

- [x] 4.1 Add a probe check that encrypts and decrypts a fixed value with the configured key
- [x] 4.2 Attempt to decrypt the stored class PIN when an open class exists
- [x] 4.3 Report key health through an internal check and a startup warning
- [x] 4.4 Document the operator response when key health fails

## 5. Verification

- [x] 5.1 Integration test: forced rate-limit or DB failure yields the generic response
- [x] 5.2 Integration test: a failure produces a correlation-id log entry without sensitive values
- [x] 5.3 Test that a mismatched key fails the health check with a clear message
- [x] 5.4 E2E smoke: no framework error text appears on public sign-in pages

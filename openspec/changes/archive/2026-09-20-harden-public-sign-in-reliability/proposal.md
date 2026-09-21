## Why

Student sign-in failures are indistinguishable from crashes: public actions swallow every error into generic notices, neither the public nor the staff route tree has an error boundary, the class PIN entry action and the public entry routes are unguarded, and there is no logging or key-health check to reveal a bad failure. A misconfigured or rotated credential key silently makes every stored PIN and credential undecryptable, so the PIN gate rejects every attempt with no visible cause.

## What Changes

- Add error boundaries for the public sign-in routes and the staff route tree so a failure shows a usable page instead of a framework error.
- Log public sign-in and entry-route failures server-side with a correlation identifier, excluding phones, tokens, credentials, and personal values.
- Add a credential-key health check that verifies decryption of a known probe value and reports a clear, actionable failure.
- Guard the class PIN action and both public entry routes so database, rate-limit, or workflow failures return the generic unavailable response.

## Capabilities

### New Capabilities
- `public-sign-in-reliability`: containment, observability, and key-health guarantees for the public sign-in surface.

### Modified Capabilities
None. Existing sign-in behavior is unchanged; this change makes failures visible and contained.

## Impact

- Modules: student sign-in actions and entry routes, workflow, crypto configuration, staff and public route trees.
- Operations: a key-health signal that surfaces configuration drift before students hit it.
- Testing: coverage that a forced dependency failure yields the generic response and a logged correlation id.

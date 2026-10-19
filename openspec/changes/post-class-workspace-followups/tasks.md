## 1. Review workspace refinements

- [x] 1.1 Stop the roster row from expanding automatically: keep the attention flag and status, and leave the row compact until the operator opens it.
- [x] 1.2 Derive the MTU usage area's summary line from the recorded usage — equipment, supplies with quantities, transport with mileage, and free-text extras — and state that nothing is recorded when it is empty.

## 2. Instructor management

- [x] 2.1 Add a `removeClassInstructor` service that removes an assignment from an open class, refuses when it would remove the only lead, re-checks the Fire instructor guard, and writes an audit event.
- [x] 2.2 Expose a remove-instructor action that calls the service and revalidates the class pages.
- [x] 2.3 Rework the instructors area: add an active staff member as an assisting instructor, change the lead, and remove an assignment, surfacing the refusal when the only lead is targeted.

## 3. Class-runs-long

- [x] 3.1 Re-verify the raised-total propagation against the reported flow on dev and fix it only if it reproduces.

## 4. Tests

- [x] 4.1 Test that a flagged roster row stays compact and expands only when opened.
- [x] 4.2 Test that the MTU area summarises the recorded usage and states that nothing is recorded when empty.
- [x] 4.3 Test that an assisting instructor can be added and removed, the lead can be changed, and removing the only lead is refused.

## 5. Verification

- [x] 5.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 5.2 Run the review-screen browser spec and the class-related integration tests.
- [x] 5.3 Confirm `openspec validate post-class-workspace-followups --strict` passes.

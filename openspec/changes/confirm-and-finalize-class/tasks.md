## 1. Move the readiness gate to finalization

- [x] 1.1 Remove the `validateRosterCompletion` call from `transitionClass` so completing an open class no longer depends on roster readiness
- [x] 1.2 Confirm `finalizeClass` still enforces roster readiness and leave that check unchanged
- [x] 1.3 Update the class policy and service tests so completing with roster errors is permitted while finalizing with roster errors is still rejected

## 2. Completing navigates to the review step

- [x] 2.1 In `transitionClassAction`, raise the redirect to `/staff/classes/{classId}/review` after the `try/catch` and only when the target status is `completed`
- [x] 2.2 Keep the cancel path returning its action state without redirecting, and keep both paths revalidating the class routes
- [x] 2.3 Add a test asserting that completing navigates to the review step and cancelling does not

## 3. Review screen confirms and corrects

- [x] 3.1 Load the class form options on the review screen and compose `ClassForm` bound to `updateClassAction` with the class's current values
- [x] 3.2 Compose the session list and `ComponentForm` bound to `saveComponentAction`, including the add-session form
- [x] 3.3 Compose the lead-instructor assignment form bound to `assignInstructorAction`
- [x] 3.4 Present the class-detail, session, and instructor forms in a collapsed section that expands for correction, leaving the readiness list and roster as the default view
- [x] 3.5 Warn near the reporting-systems selection that changing it can invalidate attendance recorded under the previous selection
- [x] 3.6 Withhold the finalization action while the readiness list is non-empty, keeping the issue list visible
- [x] 3.7 Keep the finalized state read-only: no class-detail, session, or instructor editing once a class is finalized

## 4. Class page points at the review step

- [x] 4.1 Stop rendering the finalize control on the class detail page for a completed class, leaving review-and-finalize as the primary action
- [x] 4.2 Keep the reopen control available on the class detail page for a finalized class
- [x] 4.3 Confirm the live roster, the sign-in record link, and the QR panel are unaffected

## 5. Verification

- [x] 5.1 Integration-test that completing a class whose roster has errors succeeds and that finalizing that same class is rejected
- [x] 5.2 Integration-test that class details, sessions, and instructors remain editable while a class is completed
- [x] 5.3 E2E: finishing attendance lands on the review screen
- [x] 5.4 E2E: correct a roster on the review screen and finalize from it
- [x] 5.5 Run `npm run check`, `npm run test`, the integration suite, and `npm run build`

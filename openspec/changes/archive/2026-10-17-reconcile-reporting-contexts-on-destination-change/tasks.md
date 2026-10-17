## 1. Share the inclusion derivation

- [x] 1.1 Extract the per-set inclusion computation used by `recomputeAttendanceInclusion` (`src/modules/credential-correction/service.ts`) into a reusable helper that, given a transaction, a class, and an attendance, derives each resolved requirement set's inclusion from the attendance's captured snapshots.
- [x] 1.2 Rewire `credential-correction` to call the shared helper with no behavior change, and confirm its existing tests still pass.

## 2. Reconcile attendance context on reporting-system change

- [x] 2.1 Add a reconciliation function that, for a class, inserts a reporting context for every resolved requirement set an active attendance is missing and deletes any context whose set is no longer selected, using the shared helper for the inserted rows' inclusion.
- [x] 2.2 Call the reconciliation from `updateClass` (`src/modules/classes/services.ts`) immediately after `replaceReportingSystems`, inside the same transaction.
- [x] 2.3 Confirm the reconciliation is idempotent and repairs drift on a save that does not change the destination set.
- [x] 2.4 Confirm it is a no-op on the creation path where the class has no attendance, and that removed attendance keeps its contexts untouched.
- [x] 2.5 Call the reconciliation from `finalizeClass` (`src/modules/classes/finalization.ts`) before `validateRosterCompletion`, so a class whose destinations changed after sign-in locks successfully and issues its certificates without a separate save.
- [x] 2.6 Call the reconciliation from `getRosterReadiness` (`src/modules/instructor-roster/services.ts`) before it compares contexts to the resolved sets, so the review screen presents the finalize action for a class whose destinations changed after sign-in.

## 3. Tests for reconciliation

- [x] 3.1 Integration: sign attendance into an MTU-only open class, add KBEMS, then finalize — finalization succeeds and certificate deliveries are queued. (Adapted: the guard makes MTU-only classes impossible, so the suite signs into a Fire class and adds KBEMS.)
- [x] 3.2 Integration: reopen a finalized MTU-only class, add KBEMS, re-finalize — revision 2 is created and certificate deliveries are queued for every participant with an email. (Adapted to a Fire class.)
- [x] 3.3 Integration: remove a reporting system from an open class with attendance — no active attendance retains a context for it.
- [x] 3.4 Integration: an added system whose rule requires an unsupplied attribute resolves excluded (Fire without FFN); a credential-free system resolves included (KBEMS); no credential or student-field snapshot is created.
- [x] 3.5 Regression: finalization still fails with "Active attendance is missing required reporting context" when an attendance's context is missing (backstop intact).
- [x] 3.6 Finalize a class whose destinations changed after sign-in without any save — finalization reconciles, succeeds, creates the revision, and queues a certificate for every participant with an email.
- [x] 3.7 Readiness: the review screen for a class whose destinations changed after sign-in presents the roster as ready to finalize.

## 4. Require an accreditation destination with MTU

- [x] 4.1 Enforce in `createOpenClass` and `updateClass` (`src/modules/classes/services.ts`) that selecting MTU also selects Fire or KBEMS, rejecting an MTU-only selection with a clear message.
- [x] 4.2 Update the class-creation wizard's Destinations step to prevent an MTU-only selection and explain why.
- [x] 4.3 Update the class-name derivation and messaging to drop the no-longer-reachable "entered class name when neither Fire nor KBEMS is selected" path.
- [x] 4.4 Update existing tests and fixtures that create MTU-only classes to select Fire or KBEMS: integration `mtu-catalog` and `reporting-destinations` (both pass), and the browser `class-creation`, `reporting-destinations`, `class-wizard-mtu-mileage` specs (updated to pair MTU with KBEMS; not executed in this environment — see 6.1 note).
- [x] 4.5 Add tests: an MTU-only create and an MTU-only save are rejected; MTU with Fire, KBEMS, or both is accepted; removing the last Fire and KBEMS from an MTU class is rejected.

## 5. Immediate remediation of the affected class

- [ ] 5.1 Produce the affected production class's certificates. Pre-deploy backfill done: the six missing KBEMS `attendance_reporting_contexts` rows were inserted into `roster_production` (`included = true`, per the KBEMS `all` rule) — verified 12 context rows, 2 per active attendance. Remaining: the lead instructor re-finalizes "Airway Management" in the production app to queue the certificates.
- [ ] 5.2 Confirm all six completion certificates are queued and delivered.
- [x] 5.3 Confirm the class's destinations comply with the new rule (Fire or KBEMS alongside MTU). Verified read-only against production: destinations are `kbems,mtu`, so it complies.

## 6. Verification

- [x] 6.1 Run the repository's lint, typecheck, and test commands and resolve any failures. Lint and typecheck are clean; all 448 unit tests pass; the reconciliation and MTU integration suites pass. Pre-existing, unrelated failure: `training-categories.test.ts` "seeds the EMS categories…" (in-flight `add-training-categories` work, untouched by this change). Browser E2E could not run here — sign-in times out before any wizard step, an environment issue.
- [ ] 6.2 After deployment, confirm an administrator re-save reconciles contexts and a re-finalized class produces certificates.

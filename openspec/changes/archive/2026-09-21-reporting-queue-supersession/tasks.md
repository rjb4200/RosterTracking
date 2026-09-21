## 1. Queue data

- [x] 1.1 Extend the reporting queue query to resolve, per item, the immediately preceding revision of the same class
- [x] 1.2 Carry the superseded revision number and that revision's status for the same destination in the queue result
- [x] 1.3 Leave first-time finalizations unmarked, so the distinction is meaningful in both directions

## 2. Queue screen

- [x] 2.1 Mark revised work in the reporting queue and show the revision it supersedes
- [x] 2.2 Show the superseded revision's status for the same destination on the item
- [x] 2.3 Link from the item to the superseded revision and its recorded statuses
- [x] 2.4 Keep the revised-work marker visible when the superseded status falls outside the active filter

## 3. Verification

- [x] 3.1 Integration-test that a re-finalized class marks its destination work as revised and names the prior revision and its status
- [x] 3.2 Integration-test that a first-time finalization is not marked as revised
- [x] 3.3 E2E: finalize a class, mark a destination entered, reopen, re-finalize, and confirm the queue shows revised work carrying the prior status (Implemented by seeding the post-re-finalization state — revision 1 Fire entered, revision 2 Fire pending — and asserting the queue UI, matching this spec's existing DB-fixture convention rather than driving reopen/re-finalize through the UI.)
- [x] 3.4 Run `npm run check`, `npm run test`, the integration suite, and `npm run build` (check, 149 unit tests, 34 integration tests after an approved integration-DB reset, and build all pass)

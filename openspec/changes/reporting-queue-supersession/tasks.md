## 1. Queue data

- [ ] 1.1 Extend the reporting queue query to resolve, per item, the immediately preceding revision of the same class
- [ ] 1.2 Carry the superseded revision number and that revision's status for the same destination in the queue result
- [ ] 1.3 Leave first-time finalizations unmarked, so the distinction is meaningful in both directions

## 2. Queue screen

- [ ] 2.1 Mark revised work in the reporting queue and show the revision it supersedes
- [ ] 2.2 Show the superseded revision's status for the same destination on the item
- [ ] 2.3 Link from the item to the superseded revision and its recorded statuses
- [ ] 2.4 Keep the revised-work marker visible when the superseded status falls outside the active filter

## 3. Verification

- [ ] 3.1 Integration-test that a re-finalized class marks its destination work as revised and names the prior revision and its status
- [ ] 3.2 Integration-test that a first-time finalization is not marked as revised
- [ ] 3.3 E2E: finalize a class, mark a destination entered, reopen, re-finalize, and confirm the queue shows revised work carrying the prior status
- [ ] 3.4 Run `npm run check`, `npm run test`, the integration suite, and `npm run build`

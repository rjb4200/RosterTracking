## 1. Review program

- [x] 1.1 Confirm the two filed defects (#12 reporting queue cannot distinguish a re-finalized class, #13 wizard action row overlaps on narrow viewports) as review findings rather than new work
- [x] 1.2 Accessibility review of the staff workflows and the public student sign-in journey, recorded as findings
- [x] 1.3 Mobile and tablet review of every staff workflow, recorded as findings
- [x] 1.4 Browser compatibility review beyond Chromium and mobile Chrome, recorded as findings
- [x] 1.5 Performance review of the class page, the public sign-in route, and the roster refresh, recorded as findings
- [x] 1.6 Error-handling review confirming every route tree has containment and that failures degrade to a generic response, recorded as findings
- [x] 1.7 Security review of headers, rate limits, sensitive-data handling, and authorization boundaries, recorded as findings

## 2. Findings log and triage

- [x] 2.1 Record every finding with its severity and review area, and a disposition of fixed, deferred, or accepted
- [x] 2.2 Fix or explicitly accept each critical and high-severity finding, recording the rationale for every acceptance
- [x] 2.3 File each deferred finding as a traceable issue
- [x] 2.4 Write the epic's findings summary linking the tracker entries

## 3. Hardened production responses

Split out to the `harden-production-responses` change, which owns the security header set and its verification. Track it there rather than here.

## 4. Production failure reporting

Destination is Vercel-native runtime logs, so no monitoring dependency is added.

- [x] 4.1 Add a structured server-failure logger recording the failure kind, the route, and a correlation identifier
- [x] 4.2 Use it in the staff API routes and server modules in place of logging the raw error object
- [x] 4.3 Ensure entries exclude phone numbers, credential values, and raw class or device tokens
- [x] 4.4 Confirm the application logs normally with no external destination configured
- [x] 4.5 Document where reports are read and how to trace one by its correlation identifier

## 5. Operational recovery proof

- [x] 5.1 Write the backup and restore runbook, stating the snapshot frequency and retention actually configured
- [x] 5.2 Run a restore drill onto a scratch branch and verify the restored database
- [x] 5.3 Record the drill outcome and remove the scratch branch

## 6. Official roster verification

- [x] 6.1 Generate KFS-1A and KBEMS-E16 output from a representative class with real-shaped data
- [x] 6.2 Compare the output against the approved forms field by field and record every discrepancy
- [x] 6.3 Obtain and record staff visual approval, with the approval state stated explicitly

## 7. Roadmap and verification

- [x] 7.1 Add a Phase 9 section to `docs/roadmap.md` with completed work and remaining follow-ups
- [x] 7.2 Run `npm run check`, `npm run test`, the integration suite, and `npm run build`
- [x] 7.3 Run the browser suite against a production build with `E2E_PRODUCTION=1`

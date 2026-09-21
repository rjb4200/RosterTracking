## Why

The core roster workflows are deployed, so the remaining risk is no longer missing features — it is unverified behavior and an unhardened edge. The application ships no security headers, reports no production errors anywhere, and its recovery posture (daily Neon snapshots, 30-day retention) has never actually been restored. Issue #2 asks for a hardening and validation cycle, and most of its acceptance criteria are *evidence* rather than features: a test matrix, a findings log, documented and tested recovery, and an updated roadmap.

## What Changes

- Run a review program across accessibility, mobile and tablet, browser compatibility, performance, error handling, and security — **recording findings with severity rather than fixing them inline**, so the work is triaged before it is built.
- Harden production responses: security headers on every response, and no framework version disclosure.
- Report production server failures to a monitoring destination with a correlation identifier, without recording personal values.
- Document and **test** recovery: a restore drill from a Neon snapshot with a written runbook, so "backups exist" becomes "recovery is proven".
- Verify the KFS-1A and KBEMS-E16 printed output against the approved forms with real representative data, for staff visual approval.
- Update the architecture roadmap with a Phase 9 section; it currently stops at Phase 8.
- Findings that require behavior changes become their own changes. Critical and high-severity findings are fixed here or explicitly accepted with a recorded rationale.

## Capabilities

### New Capabilities
<!-- None: hardening and operational evidence extend the existing foundation. -->

### Modified Capabilities
- `application-foundation`: production responses are hardened, production failures reach a monitoring destination, and operational recovery is documented and tested. Its existing *Automated quality checks* and *Maintained architecture roadmap* requirements already establish the verification and documentation ground this extends.

## Impact

- **Platform**: response headers (a middleware or `next.config.ts` headers) and a monitoring/error-reporting dependency — the only genuinely greenfield build, since `package.json` currently carries neither.
- **Reused, not rebuilt**: the rate-limit module, the audit log, the `verify` / `verify:full` / `smoke` commands, and Neon's snapshot schedule are all reviewed or exercised here rather than replaced.
- **Documentation**: a findings log, a recovery runbook, and the roadmap's Phase 9 section.
- **No schema change** and no migration.
- **Human gates**: staff visual approval of the official roster PDFs cannot be automated, and the restore drill needs a real snapshot restored into a scratch branch.
- **Out of scope (recorded assumption)**: the UX redesign program filed as #14–#33 is treated as separate work. Several of those issues overlap behavior already shipped, so folding them in would make this epic unbounded. The two filed defects #12 and #13 are treated as pre-existing findings the review program should confirm and triage rather than duplicate.

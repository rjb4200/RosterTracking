# Roadmap

## Phase 7 complete

- Immutable finalization revisions and reopen lineage.
- Independent Fire, KBEMS, and FEMA reporting statuses with pending and correction queues.
- No official form generation, external submission, or PDF storage in this phase.

## Phase 8

- Map immutable revision facts to approved agency forms.
- Generate and store official roster artifacts.
- Add external agency submission integrations where approved.

## Phase 9

Production hardening, extensive testing, and improvement (issue #2).

### Complete

- Security response headers on every route, with a content security policy,
  strict transport security, a framing restriction, and the rest. The policy is
  exercised against the real journeys on a production build.
- Structured, sanitized server-failure logging: failure kind, route, and
  correlation identifier, with no field able to carry a personal value.
- Reviews completed across accessibility (axe), mobile, browser compatibility
  (Firefox and WebKit added to the suite), and performance.
- A restore drill from a production snapshot, verified against production row
  for row. Recovery is proven, not assumed.
- Official roster output verified field by field against the approved KFS-1A and
  KBEMS-E16 templates, and signed off.
- Production migration ledger reconciled and `0013` applied, so the schema and
  the ledger agree and migrations can ship again.

### Follow-ups

- **Change the `classes.status` column default.** It still defaults to `'draft'`,
  which the narrowed check constraint forbids — inert today, but wrong (H-14).
- **Flag revised reporting work** so a re-finalized class is not reported twice
  (#12, #35). The only finding whose failure mode is a wrong external
  submission.
- **Colour contrast** on the staff login page and workspace (#39).
- **Mobile coverage** of the staff workflows, currently blocked by the wizard
  layout defect (#13).
- **Staff authentication hardening**: per-IP rate limiting (#36) and audit
  events for failed logins (#37).
- **Error boundaries** for the root and login route segments (#38).
- **Landing page horizontal overflow in Firefox** (#40).
- **Accessibility review beyond the key journeys.** The axe pass covers the
  landing, sign-in, staff login, and workspace. The remaining staff screens are
  unaudited.

## Context

See `proposal.md - Why`. The current model lives in `reporting-requirements` (systems map to *required* credentials, resolved as a class union) and is enforced by `student-identification` (collect missing required credentials before attendance) and `attendance-sign-in` (class-required credentials, requirement snapshots). Credentials are data-driven (`credentials`) and reporting destinations are already independent and status-tracked (`finalization-reporting`). Instructor FFN already flows into official output (`instructor-profiles`, `class-management`, `official-roster-pdfs`).

This change relocates the FFN from the sign-in gate to the Fire output's eligibility predicate, and drops the credential requirement from KBEMS.

## Goals / Non-Goals

**Goals:**
- Anyone can sign in and confirm attendance; no credential gates sign-in.
- Fire roster contains only attendees with a valid FFN; everyone receives a certificate.
- One canonical FFN format (`0000-0000`) shared by new student and staff entries.
- A Fire class cannot exist without valid instructor FFNs.
- Recovery anchored on prior phone + email.

**Non-Goals:**
- Generating or changing the KBEMS-E16 form (still status-only; not an output).
- Changing certificate issuance (already universal).
- Building a Fire Commission integration to verify FFN authenticity — validity here means format only.
- Reworking the reporting queue's overall UX beyond the destination count.

## Decisions

**1. Reporting systems declare *inclusion predicates*, not sign-in requirements.**
`reporting-requirements` keeps versioned, data-driven requirement sets but reinterprets them: Fire's rule is "attendee has a valid FFN"; KBEMS's rule is "include everyone"; MTU's is "include none". Rendered as `specs/reporting-requirements`. Alternative considered: per-attendance reporting membership chosen by the attendee or staff. Rejected — the predicate is derivable from the credential, so no new selection UI is needed.

**2. FFN validity is a format rule owned by the credential type.**
The `credentials` capability gains a per-type value format; FFN's is `0000-0000`. New values are stored canonically as the formatted string (FFN is no longer a lookup or recovery key, so no digits-only normalization is needed). Existing test-only FFNs remain untouched until the test data is cleared. Alternative considered: store 8 digits and format for display. Rejected as unnecessary indirection.

**3. Eligibility is derived live while a class is open and frozen at finalization.**
For an open class, Fire inclusion is computed from the attendee's current FFN, so a staff correction (adding a valid FFN) immediately puts them on the Fire roster. Finalization snapshots each attendee's inclusion into the immutable revision (`finalization-reporting`), and `official-roster-pdfs` renders the KFS-1A from that snapshot. Rationale: matches the existing "reporting facts are frozen at finalization" model and keeps the PDF stable, while still allowing pre-finalization fixes without a reopen.

**4. The Fire class guard is enforced at creation and on edit.**
`class-creation-wizard` blocks Fire class creation; `class-management` blocks adding Fire or changing instructors on a Fire class. Both check the lead and every assisting instructor. Alternative considered: enforce only at finalization. Rejected — the requirement is a creation precondition, and edit enforcement closes the create-then-edit bypass.

**5. Sign-in credential prompts are optional and inferred from the class.**
Fire → prompt FFN; KBEMS → prompt KEMSIS and NREMT; both → all three; FEMA SID never. All optional. A malformed FFN is rejected at entry. A stored test-only non-conforming FFN does not qualify for Fire inclusion.

**6. Recovery uses prior phone + normalized email.**
Email is matched case-insensitively with surrounding whitespace trimmed, and is already required for new/confirmed students. A matched record with no stored email yields the same generic recovery failure as any other mismatch.

## Risks / Trade-offs

- **Late credential corrections after finalization** → An attendee added to Fire-eligible after finalization requires an administrator reopen and a new revision. Mitigation: live evaluation while open means most corrections happen before finalization.
- **Email as a recovery factor** → If two records ever shared an email, the pair (prior phone, email) still resolves uniquely because phone is unique. Records with no stored email cannot self-recover. Accepted; current data is test-only.
- **Existing non-conforming test values** → No bulk rewrite is possible without the key used to encrypt those credentials. They remain ineligible for Fire inclusion and will be cleared with the test data, as directed by the user.
- **Format-only "validity"** → A syntactically valid but wrong FFN still reaches the Fire roster. Accepted; no Fire Commission integration in scope.
- **Guard duplication** → Enforcement in two flows can drift. Mitigation: share one instructor-FFN validation used by both.

## Migration Plan

- No destructive schema change: KBEMS/KEMSIS rows are retained; KEMSIS simply stops being required.
- The current database contains test-only student and instructor records that the user will clear separately. No FFN data backfill or next-login correction flow is part of this change. Eligibility checks treat a missing or non-conforming FFN as ineligible without needing a stored status flag.
- Deploy the reframe atomically with the sign-in change so no window exists where sign-in blocks on credentials.
- Rollback: revert the inclusion predicate and restore the previous requirement-set resolution; the format rule is additive and safe to leave.

## Open Questions

- None that block the specs or task breakdown.

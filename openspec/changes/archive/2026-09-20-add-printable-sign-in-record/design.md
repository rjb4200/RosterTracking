## Context

See `proposal.md` — Why. `attendance_attestations` already stores the rendered text, text version, confirmation timestamp, sign-in method, originating address, request fingerprint, correlation id, and remembered-device id. The roster page and PDF paths do not read them. Finalization already snapshots attendance and attestation facts.

## Goals / Non-Goals

**Goals:**
- One authoritative derivation of the sign-in record from attendance and attestation facts.
- Print and email inclusion controlled by a checkbox.

**Non-Goals:**
- Altering the attestation wording or version.
- New attendance columns.
- Public access to the record.

## Decisions

### D1 — Derive from attendance and attestations, not audit logs

Read `attendance` joined to `attendance_attestations` (and the participant and agency) rather than `audit_logs`, which is a staff/system trail and excludes some facts by design. The attendance rows are already retained and immutable for legal purposes.

### D2 — Removed attendance is a separate retained section

Removal is a retained state change, so the record prints active attendance first and removed attendance in a history section with actor, reason, and timestamp.

### D3 — One record, two delivery surfaces

Build one record view used by both the on-screen print layout and the roster email attachment option, so printed and emailed records cannot diverge.

### D4 — Checkbox, not default

The sign-in record is opt-in on roster print and email actions, defaulting to off, matching the request that it "can be added when these are created".

### D5 — Staff-only fields

Originating address and device identifier are shown only on staff output and are excluded from any student-facing copy. Timestamps render in the department time zone.

## Risks / Trade-offs

- [Originating address is personal data] → Keep it on staff-only output only.
- [A record printed before finalization differs from the retained one] → Note the generation time and regenerate from retained facts; finalization captures the record so it does not drift.
- [Large rosters make long print jobs] → Paginate and repeat class identification on each page.

## Migration Plan

1. Add the record view and print layout; no schema change.
2. Add the checkbox to roster print and email actions.
3. Extend the finalization snapshot to retain the record facts.
4. Roll back by reverting application code; captured snapshots remain readable.

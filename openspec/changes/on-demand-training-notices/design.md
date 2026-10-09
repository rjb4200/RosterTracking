## Context

See `proposal.md` — Why. Current state that shapes the approach:

- `renderTrainingNoticePage(variant, snapshot, participant)` already renders a notice for **any** participant and is not gated by eligibility; only the auto-queue and the roster append use `qualifyingParticipants`.
- `resendParticipantNotice(...)` re-sends the **White** notice to the participant's captured email and updates the delivery row.
- `email_deliveries` is unique on `(referenceId, attendanceId, template)`, so a participant has at most one notice row per revision.
- The review screen's notice section lists only qualifying participants; `getTrainingNoticeDeliveryOverview` returns only qualifying participants.
- The official-roster email (`emailOfficialRoster`) is the existing pattern for an operator-entered recipient: render on demand, stream/attach, audit the plaintext recipient.

## Goals / Non-Goals

**Goals:**
- View and email a participant's notice on demand for any active participant of a finalized Fire class.
- Let staff choose the Yellow or White variant and enter an arbitrary address.
- Reflect the send in delivery state and audit it.
- Present the controls in one collapsed section.

**Non-Goals:**
- No change to the automated finalization lanes (White email, Yellow roster append).
- No schema change; Fire-only; finalized-only.
- No change to the KFS-1B field mapping.

## Decisions

### D1 — On-demand generation is un-gated by eligibility

The manual flows render directly from the revision for any active `attendanceId`, including host-agency participants.

- **Why**: the request is explicitly for "any student"; eligibility only governs the automated lanes.
- **Alternatives**: reuse `qualifyingParticipants` (excludes host-agency — defeats the request).

### D2 — One template id; a manual send upserts the participant's row

The Yellow and White variants share the `individual-training-notice` template id; the variant affects only the rendered attachment. An on-demand send updates the participant's existing delivery row (or inserts one) to `sent` with the entered recipient.

- **Why**: the delivery table's unique index forbids a second row per participant; delivery state should show one current row per participant.
- **Alternatives**: a distinct template per variant (splits state); a second "manual" row (conflicts with the unique index).

### D3 — Every on-demand send is audited

Record an audit event with the actor, revision, participant, variant, and plaintext recipient, mirroring the official-roster email audit.

- **Why**: a custom recipient and a host-agency override are deliberate acts that must be traceable.
- **Alternatives**: rely on the delivery row alone (loses per-send history).

### D4 — A per-participant notice route

A route renders the chosen variant from the revision and streams it inline or as an attachment, using the official-roster authority check and `no-store` headers.

- **Why**: matches the existing PDF routes; lets the UI offer inline View and direct download.
- **Alternatives**: reuse the roster route (serves the whole batch, not one participant).

### D5 — Delivery state covers all active participants

The review screen's notice state lists every active participant: qualifying participants keep their automated state, and non-qualifying participants show as not sent until an on-demand send.

- **Why**: host-agency participants can now be sent a notice, so they must be visible.
- **Alternatives**: keep two lists (duplication); keep the qualifying-only list (hides manual sends).

### D6 — One collapsed "Training notices" section

Replace the current notice delivery section with a collapsed section listing all active participants, each with a View action (inline) and a progressive Email action that reveals a variant select (default Yellow) and an address field.

- **Why**: one place for both the automated state and the on-demand controls; collapsed keeps the screen tidy.
- **Alternatives**: a separate section for manual sends (two concepts for one form).

### D7 — Fire-only, finalized-only, official-roster access

The section and actions appear only for a finalized class that reports to Fire, and are gated to operators who may generate official rosters.

- **Why**: the KFS-1B is a Fire Commission form derived from the signed revision.

## Risks / Trade-offs

- **Unique-index upsert** → a manual send while an automated send is in flight could overwrite the row's recipient; acceptable, and the audit trail keeps each send.
- **Expanded state list** → host-agency participants are shown as "not sent"; the collapsed section keeps this from cluttering the review screen.
- **Custom recipient is not stored** → deliberately; audit is the record.
- **Variant default** → the Email action defaults to Yellow (the "yellow sheet"); staff can switch to White.

## Migration Plan

1. Add the per-participant notice route (view/download, variant-aware).
2. Add the on-demand send service (render variant, upsert delivery row, audit).
3. Expand the delivery-state read to all active participants.
4. Replace the review notice section with the collapsed Training notices section and add the View/Email controls and the send action.
5. Update tests.
6. **Rollback**: revert the commit; no schema change.

## Open Questions

- None that change the approach; the default Email variant (Yellow) can be revisited.

## Why

The KFS-1B is currently produced only along two automated lanes — emailed (White) to participants outside the host agency, and appended (Yellow) to the Fire roster. Staff also need to **produce and send a notice on demand for any participant** of a finalized Fire class: to view one sheet inline, or to email a Yellow (or White) sheet to an address they type in, including for a participant who represents the host agency.

## What Changes

- Add an **on-demand, per-participant notice** action for **any active participant of a finalized Fire class**, un-gated by host-agency eligibility (host-agency participants included).
- Let staff **view the sheet inline** and **email it** to an operator-entered address, choosing **Yellow or White**.
- Record each on-demand send as the participant's **notice delivery row** (so it appears in delivery state) and as an **audit event** with the plaintext recipient and variant.
- Add a **collapsed "Training notices" section** to the review screen listing all active participants, each with a View action and a progressive Email action.
- Keep access on the **official-roster rule** (assigned instructor, Training Major, Administrator).

## Capabilities

### New Capabilities
<!-- None: this extends the existing notice capability. -->

### Modified Capabilities
- `individual-training-notices`: a notice can be generated and emailed on demand for any active participant of a finalized Fire class, to a custom address, in a chosen variant.
- `guided-roster-finalization`: the review screen offers a collapsed Training notices section listing all participants with per-student view and email controls.

## Impact

- **Route**: a per-participant notice route that renders the Yellow or White sheet and streams it inline or as a download.
- **Service**: an on-demand send that renders the chosen variant, validates and uses the entered address, updates the participant's delivery row, and writes an audit event.
- **Review screen**: a collapsed Training notices section and its controls; the notice delivery state now covers all active participants, not only the qualifying ones.
- **Data**: no schema change; the existing `email_deliveries` row is updated (upserted) for on-demand sends.
- **Auth**: reuses the official-roster authority check.

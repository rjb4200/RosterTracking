## 1. Per-participant notice route

- [x] 1.1 Add a route that renders one participant's notice for a chosen variant from a finalized revision and streams it inline or as an attachment, using the official-roster authority check and no-store headers

## 2. On-demand send service

- [x] 2.1 Add a renderer for one participant's notice in the chosen Yellow or White variant, un-gated by host-agency eligibility
- [x] 2.2 Add an on-demand send that validates and uses the entered address, upserts the participant's delivery row to sent, and audits the actor, participant, variant, and plaintext recipient
- [x] 2.3 Expand the delivery-state read to all active participants, showing the automated state for qualifying participants and not-sent for the rest

## 3. Review screen

- [x] 3.1 Replace the notice delivery section with a collapsed Training notices section listing every active participant
- [x] 3.2 Add a per-participant View action and a progressive Email action that reveals a variant select (default Yellow) and an address field
- [x] 3.3 Wire the on-demand send action and gate the section to operators who may generate official rosters

## 4. Tests and verification

- [x] 4.1 Unit-test rendering a notice for any participant and in each variant
- [x] 4.2 Integration-test an on-demand send for a host-agency participant (delivery row updated and audit written)
- [x] 4.3 Run `npm run check`, `npm run test`, the touched integration tests, and `npm run build`

## 5. Docs

- [x] 5.1 Document the on-demand notice action (view/email any participant) in README and architecture

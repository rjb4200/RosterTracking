## 1. Destinations data

- [x] 1.1 Deactivate the FEMA reporting system and the FEMA SID credential type in the reference seed
- [x] 1.2 Seed MTU as a reporting system with an active requirement set that requires no student credential or field
- [x] 1.3 Confirm existing finalization reporting statuses for FEMA remain readable

## 2. MTU usage

- [x] 2.1 Add an `mtu_usage` table keyed to the class with free-text equipment used, mileage, and used supplies
- [x] 2.2 Persist MTU usage when the class is created or edited while open or completed
- [x] 2.3 Reject MTU usage edits after finalization
- [x] 2.4 Extend the finalization snapshot with an optional `mtuUsage` block and write it at finalization
- [x] 2.5 Cover the missing-`mtuUsage` case for older revisions

## 3. Destinations-first wizard

- [x] 3.1 Compute the wizard step list from the selected destinations, in a stable order
- [x] 3.2 Render the Destinations step first with Fire, KBEMS, and MTU (no FEMA)
- [x] 3.3 Add a KBEMS step capturing course description/objectives
- [x] 3.4 Add an MTU step capturing equipment used, mileage, and used supplies
- [x] 3.5 Move course, delivery, site, schedule, lead instructor, host agency, and PIN to the class-and-schedule step
- [x] 3.6 Retain but do not submit values for a cleared destination
- [x] 3.7 Update the review step to summarize selected destinations and their captured values

## 4. Reporting queue

- [x] 4.1 Show MTU as a destination and stop offering FEMA for new work
- [x] 4.2 Confirm MTU queue items offer no roster PDF action

## 5. Verification

- [x] 5.1 Unit tests for computed steps, destination add/remove, and MTU validation
- [x] 5.2 Integration tests for MTU persistence, finalization snapshot, and FEMA deactivation
- [x] 5.3 Browser coverage for destination-driven steps and MTU capture
- [x] 5.4 Run `npm run check` and `npm run build`

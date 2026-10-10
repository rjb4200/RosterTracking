## 1. FFN format and validation foundation

- [x] 1.1 Add per-credential-type value-format support to the credential model and validation path
- [x] 1.2 Define the FFN value format as `0000-0000` and reject values that do not match
<!-- Legacy backfill omitted: the user confirmed existing records are test data to be cleared separately. -->

## 2. Reporting inclusion model

- [x] 2.1 Reframe versioned requirement sets into inclusion predicates: Fire = valid FFN, KBEMS = include all, MTU = include none
- [x] 2.2 Resolve effective inclusion rules for the reporting systems selected on a class
- [x] 2.3 Show resolved inclusion rules to staff before class submission (no credential is required to sign in)

## 3. Student sign-in

- [x] 3.1 Remove the credential gate so attendance confirmation never requires a credential
- [x] 3.2 Add per-destination optional credential prompts: FFN when Fire is selected; KEMSIS ID and NREMT when KBEMS is selected; FEMA SID never
- [x] 3.3 Reject a malformed FFN entered at sign-in and allow correction or blank
- [x] 3.5 Add the Fire-credit warning before confirmation when Fire is selected and no valid FFN is present
- [x] 3.6 Replace changed-number recovery with prior phone + normalized (trimmed, case-insensitive) email; generic failure when no email is stored
- [x] 3.7 Retain supplied credential values plus the resolved reporting inclusion on the attendance record

## 4. Fire class instructor guard

- [x] 4.1 Add a shared instructor-FFN validation used by both creation and edit flows
- [x] 4.2 Block Fire class creation when the lead or an assisting instructor lacks a valid FFN, with an actionable message
- [x] 4.3 Block adding the Fire reporting system or changing instructors on a Fire class when any assigned instructor lacks a valid FFN

## 5. Reporting and official outputs

- [x] 5.1 Freeze each attendee's resolved Fire inclusion into the finalization revision
- [x] 5.2 Derive the Fire queue item's included attendee count from the Fire-eligible subset
- [x] 5.3 Generate KFS-1A participant rows and appended individual training notices from the valid-FFN subset only
- [x] 5.4 Confirm completion certificates remain issued to every attendee regardless of credentials

## 6. Staff profile FFN

- [x] 6.1 Update instructor FFN storage and validation to the `0000-0000` format

## 7. Verification

- [x] 7.1 Test inclusion resolution: Fire excludes non-FFN attendees; KBEMS includes all; classes are never sign-in-gated
- [x] 7.2 Test sign-in: no-gate confirmation, per-destination prompts, malformed-FFN rejection, and Fire-credit warning
- [x] 7.3 Test changed-number recovery by prior phone + email, including the no-stored-email failure
- [x] 7.4 Test the Fire class guard on creation and on edit
- [x] 7.5 Run `openspec validate reframe-reporting-as-inclusion --strict`, plus the project lint and typecheck commands

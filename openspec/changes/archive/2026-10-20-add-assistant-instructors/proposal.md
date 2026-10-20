## Why

A class is sometimes led by an instructor who is not a fire instructor, with a fire-qualified instructor assisting — for example an EMS-led course taught with a fire instructor on hand. The application cannot represent this: class creation assigns only a lead instructor, no screen anywhere assigns an assistant, and the Fire roster assumes the lead is the fire-qualified signer. Staff must work around the tool to record the real instructor pair and the correct Fire paperwork.

## What Changes

- Class creation's **Class & schedule** step gains an optional **assistant instructor** picker beside the existing lead instructor picker.
- A class has **exactly one lead and zero or one assistant**. Authorized staff may replace the lead or set, change, or clear the assistant while the class is open. Replacing the lead removes the previous lead; it does not demote them into the assistant slot. An instructor cannot hold both roles.
- A **fire instructor** is a staff member with **both** a valid Fire Commission FFN (`0000-0000`) **and** a Fire Instructor certification level (1/2/3).
- A Fire class **BREAKING**: it no longer requires every assigned instructor to be fire-qualified. It requires **at least one** assigned instructor who is a fire instructor. The lead need not be one.
- The **class lead remains the only finalizer** and certifies the roster. The **Fire signer** is the fire-eligible lead when eligible, otherwise the fire-eligible assistant. The Fire signer attests the Fire roster and individual training notice.
- If the lead is the Fire signer, finalization captures the Fire attestation in the same action. If not, the Fire signer attests the locked revision afterward through a "Sign Fire roster" action; the roster does not reopen.
- The **KFS-1A roster and individual training notice are generated only after the Fire attestation exists**. New revisions do not render a blank instructor signature.
- The Fire reporting destination cannot be marked `entered` until the Fire attestation exists.
- The Fire signer's workspace lists the class awaiting their Fire signature.
- The completion certificate is unchanged: it remains the class lead's document and signature.

## Capabilities

### New Capabilities

<!-- None: the assistant-instructor and Fire-signing concepts extend existing capabilities. -->

### Modified Capabilities

- `class-creation-wizard`: adds the optional assistant instructor picker, the at-least-one-fire-instructor rule, and the resolved Fire signer in the review summary.
- `class-management`: exactly one lead and at most one assistant, lead replacement semantics, assistant set/clear, and the at-least-one-fire-instructor guard.
- `roster-signing`: the Fire roster and notice require the Fire signer's attestation; the lead remains the finalizer and roster certifier.
- `official-roster-pdfs`: the KFS-1A Lead fields show the Fire signer, the Assisting fields show the other instructor, and the roster is generated only after the Fire attestation.
- `individual-training-notices`: the notice's name, FFN, and signature follow the Fire signer and are generated only after the Fire attestation.
- `guided-roster-finalization`: the lead finalizes; the Fire signer signs the locked revision when they are not the lead.
- `operational-class-dashboards`: the Fire signer's workspace lists the class awaiting their Fire signature.
- `finalization-reporting`: the revision records the lead's roster attestation and the Fire attestation; the Fire attestation may be appended after finalization and gates Fire reporting.

## Impact

- **Services**: `createClass` and `assignClassInstructor` (`src/modules/classes/services.ts`) accept an assistant; `requireFireInstructorFfns` (`classes/instructor-ffn.ts`) changes from "every instructor" to "at least one fire instructor" and is validated against the resulting assignment set; finalization records the Fire attestation and Fire reporting checks it.
- **UI**: `class-creation-wizard.tsx`, `instructor-assignment-form.tsx`, the class edit/review screens, and the Fire signer's sign action.
- **Rendering**: `official-roster-pdfs` (KFS-1A fill) and the individual training notice are gated on the Fire attestation. The completion certificate is unchanged.
- **Data**: no change to `class_instructors`; the change enforces exactly one lead and at most one assistant in the service and UI. A Fire attestation is recorded against the finalization revision; `add-per-document-signing` generalizes it to scope-keyed attestations.
- **Downstream**: Fire reports and rosters resolve the Fire signer; the certificate continues to resolve the class lead.

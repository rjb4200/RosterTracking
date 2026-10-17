## Why

A class is sometimes led by an instructor who is not a fire instructor, with a fire-qualified instructor assisting — for example an EMS-led course taught with a fire instructor on hand. The application cannot represent this: class creation assigns only a lead instructor, no screen anywhere assigns an assistant, and the Fire roster and signing flow assume the lead is the fire-qualified signer. Staff must work around the tool to record the real instructor pair and the correct Fire paperwork.

## What Changes

- Class creation's **Class & schedule** step gains an optional **assistant instructor** picker beside the existing lead instructor picker.
- A class may have zero or one assistant instructor. An assistant can be **added, changed, or removed** on an open class (edit and review screens) until it is finalized; the lead is unchanged by these actions.
- Instructors are chosen from the same list already offered for the lead — every active staff member (administrators, training majors, and instructors).
- A **fire instructor** is a staff member with **both** a valid Fire Commission FFN (`0000-0000`) **and** a Fire Instructor certification level (1/2/3).
- A Fire class **BREAKING**: it no longer requires every assigned instructor to be fire-qualified. Instead it requires **at least one** assigned instructor who is a fire instructor. The lead need not be one.
- When the class's lead is **not** a fire instructor and the assistant **is**, the **assistant signs** the Fire roster: they are the finalization signer, their name appears in the **lead instructor position at the top** of the KFS-1A, and their electronic signature prints there.
- The signing instructor's workspace surfaces the class as awaiting their signature, so an assisting signer sees it on their own page when they sign in.
- The completion certificate and individual training notice instructor name, FFN, and signature follow the **signing instructor** rather than strictly the lead.

## Capabilities

### New Capabilities

<!-- None: the assistant-instructor concept extends existing capabilities. -->

### Modified Capabilities

- `class-creation-wizard`: adds the optional assistant instructor picker on the class-and-schedule step, the review summary, and the at-least-one-fire-instructor rule for Fire classes.
- `class-management`: assignment of at most one lead and at most one assistant instructor, and add/change/remove of the assistant while a class is open.
- `roster-signing`: the attestation requirement and signer identity change from "the lead instructor" to "the signing fire instructor", which may be the assistant.
- `official-roster-pdfs`: the KFS-1A lead instructor position, FFN, certification level, and signature are populated from the signing fire instructor.
- `finalization-reporting`: who is authorized to finalize an open class includes the signing fire instructor when it is the assistant.
- `guided-roster-finalization`: the review screen presents the finalize-and-sign action to the signing fire instructor rather than only the lead.
- `operational-class-dashboards`: the signing instructor's workspace lists the class awaiting their signature.
- `completion-certificates`: the certificate signature derives from the signing instructor.
- `individual-training-notices`: the notice's lead instructor name and FFN derive from the signing instructor.

## Impact

- **Services**: `createClass` and `assignClassInstructor` (`src/modules/classes/services.ts`) accept an assistant; `requireFireInstructorFfns` (`classes/instructor-ffn.ts`) changes from "every instructor" to "at least one fire instructor"; finalization access (`classes/finalization.ts`) admits the signing assistant.
- **UI**: `class-creation-wizard.tsx`, `instructor-assignment-form.tsx`, and the class edit/review screens.
- **Rendering**: `official-roster-pdfs` (KFS-1A fill), completion certificate, and individual training notice.
- **Data**: no schema change — `class_instructors` already carries multiple rows with one `is_lead`; the change enforces at most one assistant in the service and UI.
- **Downstream**: reports and rosters that reference "the lead instructor" must resolve the signing instructor.

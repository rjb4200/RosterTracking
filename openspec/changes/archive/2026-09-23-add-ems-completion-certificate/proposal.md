## Why

A KBEMS continuing-education class requires each participant to receive a course-completion certificate; the KBEMS-E16 roster is only an optional attendance record and is not accepted as proof of completion. The app has the Winchester certificate blank but no way to produce it, and the class stores neither the "type of course" nor the "course number" the certificate prints.

## What Changes

- Add **EMS course details to the class**: a **Course type** select and a **Course number** free-text field, captured in the KBEMS step.
- Generate the **Class Completion Certificate (002)** for a finalized class, **one certificate per participant**, from the immutable revision.
- Let an **assigned instructor**, Training Major, or Administrator generate it, matching the official-roster access rule.
- Leave the **instructor signature blank** for physical signing and **record in the audit log** that it was left blank and who generated the certificate.
- Add the certificate as a versioned template alongside KFS-1A and KBEMS-E16.

## Capabilities

### New Capabilities
- `completion-certificates`: generate per-participant EMS course-completion certificates from a finalized revision.

### Modified Capabilities
- `class-creation-wizard`: the KBEMS step collects the course type and course number.
- `class-management`: the class retains an EMS course type and course number for official output.

## Impact

- **Schema**: `classes` gains `course_type` and `course_number` (nullable); the finalization snapshot gains the course type/number and the participant list needed for certificates.
- **Assets**: the certificate PDF joins the versioned template set with its checksum and template version.
- **Modules**: `class-creation-wizard.tsx` (KBEMS step fields), `classes/services.ts` and `finalization.ts` (persist and snapshot), a certificate renderer and delivery action reusing the official-roster authorization and email path.
- **Access**: instructors may generate certificates for their assigned classes only; Majors and Administrators for any finalized class.
- **Data migration**: backfill `course_type` from a sensible default and leave `course_number` empty for existing classes; no certificate can be produced until a class is finalized.
- **Dependency**: the KBEMS step comes from `rework-reporting-destinations`; the instructor name comes from `add-instructor-profiles`.

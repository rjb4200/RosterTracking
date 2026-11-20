# Proposal

## Why

The Mobile Training Unit (MTU) grant reimburses hours taught by approved MTU instructors, and some courses (for example ACLS through AHA and TECC through NAEMT) issue the official certification through an external body rather than the department. The system currently cannot record which instructors are MTU-approved, which training categories lead to an external credential, or whether a class issued a department certificate — so MTU hours cannot be attributed and internal certificates can be mistaken for official certifications.

## What Changes

- Training categories gain an optional **external certificate issuer**: `AHA`, `NAEMT`, or `Other` (none means no external credential).
- Classes gain an **issue internal certificate** flag, defaulting to on. It controls whether the automatic certificate batch is sent for the class.
- At finalization, the class's external issuer and internal-certificate flag are frozen into the revision so certificate behavior is stable for the finalized class.
- Internal certificates for a class that also has an external issuer, or for a participant with partial credit, are labeled **"— Hours Completed (Not Official Certification)"** in the certificate course title. The certificate email carries a matching clear marking.
- When a class has an external issuer but internal certificates are off, finalization sends each participant a **course-completed notice** (same branded formatting, no attachment) that reminds them to watch for their official certification.
- Automatic certificate sending is gated by the class flag; authorized staff can still send an internal certificate to an individual participant regardless of the flag.
- Staff accounts gain an **MTU instructor** checkbox, settable only by an Administrator, and instructors are identified with an MTU badge in the class instructor selector.
- No MTU hourly rate is stored; only the hours-tracking designation is captured. MTU report changes are deliberately deferred to a later change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `training-categories`: training categories gain an optional external certificate issuer.
- `class-management`: classes gain an internal-certificate flag and freeze it, together with the category's external issuer, at finalization; the instructor selector identifies MTU instructors.
- `completion-certificates`: automatic sending becomes conditional on the class flag; internal documents and emails are labeled when an external credential or partial credit applies; a completion-notice email is sent when external certification is issued without an internal certificate; individual manual sending remains available.
- `staff-account-management`: staff accounts carry an Administrator-managed MTU instructor designation.

## Impact

- Database: new columns on `training_codes`, `classes`, and `users`; forward-only migration.
- Finalization snapshot: adds the class's external issuer and internal-certificate flag, and each instructor's MTU designation.
- Certificate and email services: one shared course-label helper feeding the certificate title and email subject/body; a new completion-notice template; batch send gated by the class flag.
- Staff account and class instructor UIs: checkbox, badge, and class certificate checkbox.
- No change to the MTU usage summary report in this change; the captured designation is groundwork for it.

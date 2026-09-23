## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- The certificate blank `Class Completion Certificate Blank (002).pdf` exposes eight fields: `Student_Name`, `Class_Hours`, `Course_Type`, `Course_Number`, `Completion_Date`, `Instructor_Name`, `Instructor_Title_Course`, and `Instructor_Signature`.
- `official-roster-pdfs/service.ts` already reads and decrypts the finalized revision (`readSnapshot`), checks authority (`assertRosterAuthority`), renders with `pdf-lib`, and emails through Resend — all reusable.
- `FinalizationSnapshot` carries `class`, `instructors`, `attendance`, `components`, and credential snapshots.
- `classes` has no course type or course number; `classes.delivery_method` uses a text column with a check constraint, which is the house pattern for enumerated values.

## Goals / Non-Goals

**Goals:**
- Generate the per-participant certificate from revision facts.
- Capture the course type and course number the certificate needs.
- Reuse the roster authorization, rendering, and delivery paths.
- Leave the signature blank and audit generation.

**Non-Goals:**
- Not changing the KBEMS-E16 roster output.
- Not implementing the KAR-required TEI number or instructor provider number — the Winchester letterhead stands in for the TEI, and this blank does not print a provider number.
- Not building certificate templates for other organizations.
- Not delivering individual certificates by email per participant in this change (batch download/print only).

## Decisions

### D1 — Course type is a constrained text column; course number is free text
Add `course_type` (text with a check constraint) and `course_number` (free text) to `classes`.

- **Why**: matches the existing `delivery_method` pattern and keeps the change small; the certificate only needs a printable string.
- **Assumption**: the seeded course-type values are `continuing_education`, `initial_certification`, and `refresher`. If the real set differs, widen the check constraint and relabel.
- **Alternatives**: a `course_types` reference table (more machinery than one field needs today); free-text course type (loses the requested select).

### D2 — Certificates reuse the roster rendering and authority path
Extract the snapshot reader and authority check so the certificate renderer uses the same code, and add the certificate to the versioned template set with its checksum and template version.

- **Why**: identical access rules and the same immutability guarantee; one place to enforce "finalized revision only".
- **Alternatives**: a parallel reader (drifts from the roster path).

### D3 — One generated document, one page per participant
The renderer produces a single PDF containing one certificate page per active participant.

- **Why**: matches the batch-printing reality (an instructor prints all certificates at once) while still yielding one certificate per participant.
- **Alternatives**: a zip of single-page PDFs (harder to print); one file per request (many downloads).
- **Note**: individual per-participant download can be added later without changing the data model.

### D4 — Signature blank; generation audited
`Instructor_Signature` is never written. Each generation writes an audit event with the actor, revision, participant count, and a flag that the signature was left blank.

- **Why**: the certificate must be physically signed, and the blank must be a recorded, intentional act rather than an omission.
- **Alternatives**: an electronic signature (explicitly out of scope and not what the blank provides).

### D5 — Instructor title/course line is composed, not stored
`Instructor_Title_Course` renders as `<course type> – <course name>`, matching the blank's "*Class type– Course" line.

- **Why**: it is presentation derived from the same facts, so storing it separately would duplicate state.

## Risks / Trade-offs

- **Course-type values unknown** → seeded set documented as an assumption; a single check constraint is easy to widen.
- **Certificates for a class that never reported to KBEMS** → offer certificate actions only for revisions whose class reported to KBEMS.
- **Name splitting on the certificate** → use the participant's first and last name as stored; guest participants use their recorded guest name.
- **Batch of many participants** → one multi-page document; a very large class produces a large but valid PDF.
- **Signature audit noise** → one audit event per generation request, not per participant.

## Migration Plan

1. Add `course_type` and `course_number`; backfill `course_type` to `continuing_education` and leave `course_number` empty.
2. Add the certificate template to the versioned set with its checksum.
3. Extract the shared snapshot/authority helpers and add the certificate renderer.
4. Extend the snapshot with course type/number and the participant list.
5. Add the certificate action and UI to the finalized-class surfaces.
6. **Rollback**: revert the commit; added columns are nullable and the template is additive.

## Open Questions

- Exact course-type values (assumed `continuing_education`, `initial_certification`, `refresher`). Safe to correct without changing the approach.
- Whether individual per-participant delivery is wanted later.

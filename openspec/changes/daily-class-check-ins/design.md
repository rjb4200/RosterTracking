## Context

Initial-certification programs span several non-consecutive days. The current attendance table has one active row per student per class and the sign-in workflow returns `already_signed_in` for later scans. The Class sign-in record is built from those attendance rows with one timestamp per participant. Instructors still own the final roster and credited hours.

## Goals / Non-Goals

**Goals:**

- Record a separate check-in for each student and class date.
- Let students check in on later program dates without creating a second attendance record.
- Paginate the existing Class sign-in record by date.
- Flag students missing one or more class days.
- Require a per-student disposition before finalization: include with a note, or exclude from the certificate with a reason.
- Keep excluded students on the roster, transcript, and credited hours.
- Freeze check-ins and dispositions in the finalization revision.

**Non-Goals:**

- Pre-scheduling class days or changing the program block.
- Automatically calculating credit from check-ins.
- Changing non-initial class attendance.
- Printing exception dispositions in the certificate itself.
- Reworking the overall review workspace layout.

## Decisions

### Separate check-in rows from attendance enrollment

Add `attendance_check_ins` with one row per attendance and department-calendar date. The first scan creates the attendance row; later dates add check-in rows. A unique constraint on `(attendance_id, check_in_date)` makes same-day scans idempotent. Each check-in stores its own timestamp, sign-in method, attestation text/version, originating IP, and remembered device.

Alternative considered: multiple attendance rows per student. Rejected because the app and transcripts assume one active attendance per student/class.

Alternative considered: a single attendance row updated on every scan. Rejected because it loses per-day evidence and cannot produce a daily attendance record.

### Infer class days from check-ins

The class days are the distinct check-in dates across active attendance. There is no separate class-day schedule. A day on which nobody checks in is not a class day. A student is missing a day when the date has at least one other active check-in and the student has none.

### Keep the existing record layout, paginate by date

Build the Class sign-in record for an initial-certification class from check-ins grouped by date. Keep the current entry formatting within each date and repeat the class header on each page. Removed attendance remains in the existing retained-history section.

### Per-student certificate dispositions

For every student missing at least one class day, the review workspace requires one disposition:

```text
Include certificate → non-empty per-student note required
Exclude certificate → non-empty per-student reason required
```

The disposition belongs to the attendance record. An excluded student remains active attendance with the same roster row, credited hours, transcript, and reporting context; only the certificate queue skips them. Finalization is blocked while any flagged student has no disposition.

Alternative considered: removing the attendance. Rejected because it would erase the student from the roster and transcript.

### Freeze the evidence

The finalization snapshot stores the daily check-ins and each attendance's disposition, note or reason, and resolving actor/timestamp. The finalized Class sign-in record is built from the snapshot so later edits cannot change it.

### Attestation per check-in

Each daily check-in confirms the same attestation text and records its own confirmation facts. This gives each day the same audit weight as the current single sign-in and avoids a separate "once for the program" exception.

## Risks / Trade-offs

- **A missed day with no other check-ins is invisible** → The day is inferred from attendance; this is the consequence of not pre-scheduling days. Operationally, at least one attendee must check in for the day to exist.
- **Daily attestation adds volume** → Check-ins are small rows; the sign-in record paginates by date.
- **Only-scan enrollment means a student who never scans cannot join** → Intended; instructors handle the final roster but the class roster comes from the first scan.
- **Finalization now has a new blocker** → The readiness area names each missing student and links directly to the disposition control.
- **Excluded students remain on transcripts** → Intended; the certificate is withheld, not the attendance record.
- **Legacy initial-certification classes have no check-ins** → A class with no check-ins has no inferred class days and therefore no missing-day flags; the feature applies once daily check-ins begin.

## Migration Plan

1. Add the daily check-in table and disposition storage.
2. Record check-ins for initial-certification scans; keep existing attendance behavior for other classes.
3. Build the date-paginated record and review flags.
4. Require dispositions in finalization and skip excluded students in the certificate queue.
5. Roll back by reverting the code; existing attendance and revisions remain readable.

## Open Questions

None.

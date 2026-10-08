## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- `classes.course_id` is `NOT NULL` and `courses` is **inner-joined** in five read paths for the displayed name: `listClasses`, `listOperationalClasses`, `listPublicOpenClasses`, `finalization.buildSnapshot`, and `listReportingQueue`.
- The KFS-1A already takes its **per-subject** class names from `class_components.class_name`; `courses.name` is only a fallback (`component.className ?? snapshot.class.courseName`).
- The KBEMS-E16 `Course Name` and the completion certificate's `<type> – <course>` line use `snapshot.class.courseName`.
- The wizard's class-and-schedule step is the only place a Course is chosen, and `course_reporting_defaults` is applied by the class edit form (resetting destinations on a course change).
- The certificate blank exposes no separate course-name field; the course name appears only in the `Instructor_Title_Course` line, so EMS needs exactly one new value.

## Goals / Non-Goals

**Goals:**
- Remove the Course catalog and every reference to it.
- Give each class one name, sourced from its destination.
- Feed the KBEMS-E16 and the certificate from the class name.
- Default the scheduled duration to two hours.

**Non-Goals:**
- Not changing the KFS-1A's per-subject model (still `class_components`).
- Not changing training codes or curricula.
- Not building a course/MOU catalog for another organization.

## Decisions

### D1 — Retire `courses` outright
Drop `courses`, `classes.course_id`, and `course_reporting_defaults`; delete the Courses admin route, remove `courses.manage` and its seed grants, and drop `createCourse`/`listCourses`.

- **Why**: the catalog's only remaining consumer is the EMS course *name*, which is one free-text value; keeping a catalog forces Fire classes to reference it.
- **Alternatives**: keep `courses` dormant but stop using it (leaves dead schema and joins); keep it required for EMS only (still forces the join and the null debate).

### D2 — One class name, sourced by destination
Add `classes.name` (nullable text). At creation the wizard sets it by precedence:

```
KBEMS selected       → the EMS course name entered on the KBEMS step
else Fire selected    → the first Fire subject's Class Name
else (MTU only)       → a Class name entered on the class-and-schedule step
```

The KFS-1A keeps using the per-subject names; `classes.name` is the class's display and certificate name.

- **Why**: one value to read, search, and finalize; the certificate is always correct because EMS wins precedence.
- **Assumption**: for a class that is **both** Fire and EMS, the EMS course name wins (the certificate must carry it). The Fire-first alternative is a one-line precedence flip if that reads better.
- **Alternatives**: derive the name at read time with `coalesce` in six queries (no sync, but a correlated subquery per list/queue and awkward search); store both a display name and an EMS course name (two fields that drift).

### D3 — The EMS course name is gathered on the KBEMS step
The KBEMS step already collects course type, course number, and objectives; add the **EMS course name** as free text. It fills the KBEMS-E16 `Course Name` and the certificate's signature line.

- **Why**: this is the only datum the certificate still needs that the app does not capture (`Class_Hours`, dates, instructor, type, number already exist).
- **Alternatives**: reuse the class name text for both (works only because D2 makes them the same value for EMS).

### D4 — Scheduled duration defaults to two hours
The class-and-schedule step seeds the duration at `2` instead of `course.defaultHours`, and staff can change it.

- **Why**: with the catalog gone there is no default source, and two hours is the house default (a new component already defaults to two hours).
- **Alternatives**: leave the field empty until staff type it (blocks the Next step and adds friction).

### D5 — MTU-only classes get an explicit name
When neither Fire nor KBEMS is selected, the class-and-schedule step shows a class name field (the special case), because nothing else supplies a name.

- **Why**: MTU is resource tracking; an MTU-only class otherwise has no name for the list, directory, or snapshot.
- **Alternatives**: require Fire or KBEMS on every class (over-constrains usage tracking).

### D6 — Migrate names before dropping the column
The migration sets `classes.name = courses.name` for every existing class, then drops `course_id`, `courses`, and `course_reporting_defaults`.

- **Why**: existing classes keep a meaningful name; the class name survives even though the catalog row does not.

### D7 — Searchable pickers select the first match
The Fire subject row's training-code and curricula searches are separate inputs that only filter the `<option>` list; the `<select>` value stays empty, so the field shows its placeholder until staff open and click. Change each search so a non-empty filter selects the **first matching option** into the field (and, for the training code, pre-fills the Class Name); an empty result keeps the current selection.

- **Why**: the search is the primary interaction, so the field should reflect what the search matched rather than requiring a second, manual step.
- **Alternatives**: turn the search and select into one combobox component (larger UI change); leave filtering-only and accept the extra click (the reported bug).

## Risks / Trade-offs

- **Historical course data is lost** → the class name is retained; the catalog row and its default hours are not. Accepted (the catalog was unused beyond the name).
- **Fire + EMS precedence** → EMS wins so the certificate stays correct; noted as an assumption.
- **Five join sites change** → each `INNER JOIN courses` becomes a plain `classes.name` select, which is simpler, not more complex.
- **Fixtures reference courses** → ~20 test fixtures insert a course and assert a course-based name; they move to `classes.name`.
- **`course-catalog` capability keeps a stale name and Purpose** → the Purpose is edited in the main spec and its course requirements are removed.

## Migration Plan

1. Add `classes.name` (nullable) and backfill it from `courses.name`.
2. Drop `classes.course_id`, `course_reporting_defaults`, and `courses`.
3. Update the class services, finalization snapshot, and reporting queue to read `classes.name`.
4. Update the wizard (KBEMS course name; MTU-only name; 2-hour default; no Course select) and the class edit form.
5. Remove the Courses UI, nav item, permission, and seed; update the fixtures.
6. **Rollback**: revert the commit; `classes.name` is nullable and the dropped tables are reconstructible only from backups, so this is a one-way schema change.

## Open Questions

- None blocking. Fire + EMS name precedence is recorded as an assumption in D2.

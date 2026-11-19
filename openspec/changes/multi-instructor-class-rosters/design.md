# Design

## Context

See `proposal.md` for the motivation. The current `class_instructors` table already stores any number of rows; only the application and official PDFs assume one lead and one assistant. Fire signing is currently split between the lead (roster attestation) and a separately resolved Fire signer (possibly the assistant), which creates a pending-signature state and makes multi-assistant rosters ambiguous.

The official KFS-1A has exactly two instructor blocks and one instructor signature line. The KBEMS-E16 has one instructor-name field and one roster-signature line. These form constraints drive the design: official forms keep two instructors of record, and the rest of the team is documented on an appended supplement.

## Goals / Non-Goals

**Goals:**

- Support one lead, zero or one assistant, and any number of additional instructors on one class.
- Make the lead the sole signing authority for new revisions, including Fire and certificates.
- Keep the official KFS-1A and E16 at two instructors of record.
- Document the full instructor team, with FFN and level, on an appended supplement.
- Preserve all historical revisions, including legacy assistant-signed Fire revisions.
- Make MTU instructor counts and instructor hours include the entire team.

**Non-Goals:**

- Per-session or per-skill-station instructor assignment.
- View-only instructor roles or restricting additional instructors from class access.
- Adding instructor names to the MTU Usage Summary layout.
- Redesigning state forms, adding signature lines to the supplement, or changing official field mappings.
- Automatically reassigning existing non-fire leads.
- Changing historical revision facts or regenerating historical PDFs differently.

## Decisions

### Instructor roles are represented by two booleans

`class_instructors` keeps `is_lead` and gains `is_assistant`. A row with neither flag is an additional instructor. Partial unique indexes enforce one lead and at most one assistant per class, and a check constraint prevents a row from being both.

Why not a `role` enum: `isLead` is used across class access, finalization, reminders, and official outputs. An additive boolean keeps those paths stable and makes the migration reversible without rewriting every query. The role labels live in the UI and PDF layer.

### The assistant is optional but is the second instructor of record

The assistant is not merely the first additional instructor. It is the second official form name. Additional instructors are team members outside the official form slot. The UI must say this plainly so “assistant” is not mistaken for “any helper.”

### Only the lead signs new revisions

For a new Fire class, the lead must be fire-qualified. Finalization records both the `roster` and `fire` attestations for the lead in one action. New revisions never enter a pending Fire-signature state. The snapshot records the lead as `fireSignerUserId` for compatibility with existing consumers.

This removes the Fire-signer resolver from the active path. `resolveFireSigner` and the pending-signature workflow remain only for reading and completing legacy revisions.

Alternative rejected: keeping an explicit Fire-signer role would preserve flexibility but reintroduce the ambiguity this change is meant to remove.

### Fire eligibility is validated on the lead

The Fire guard checks only the resulting lead's FFN and instructor level. Assistants and additional instructors may be non-fire. This applies when Fire is selected and whenever a Fire class's instructors change. Finalization revalidates the lead before creating a revision.

Existing open Fire classes with a non-fire lead are blocked from save/finalization until corrected. No automatic role swap is performed because it would change finalization and signing accountability.

### Official PDFs keep two instructors of record

KFS-1A maps the lead to the Lead fields and the assistant to the Assisting fields. If no assistant exists, the Assisting fields are blank. Additional instructors never enter those fields. The E16 instructor-name field contains the lead and assistant.

The KFS signature remains the lead's typed-name line. No assistant signature area is added.

### The instructor supplement is an appended page

When a finalized revision has more than two assigned instructors, the system appends an Instructor Roster Supplement:

- One table with every instructor's name, FFN, level, and role.
- Roles: Lead, Assistant, Additional.
- Same page size and typography as the accompanying form.
- No signature lines.
- Generated from the finalized snapshot, not live data.
- Appended after the KFS-1A pages and before individual training notices; appended after the E16 pages in the certificate packet.

The supplement is not a state form. Missing FFN or level values are left blank without omitting the instructor.

### The finalization snapshot records every instructor and role

`FinalizationSnapshot.instructors` gains an optional `isAssistant` flag. New snapshots record every assigned instructor and role. Legacy snapshots without the flag continue to render through the existing legacy Fire-signer path. The supplement is generated only for new snapshots with more than two instructors.

### MTU reporting counts every instructor row

The MTU Usage Summary already counts all `class_instructors` rows and multiplies class hours by that count. No report query change is required for headcount or instructor hours. Instructor names are documented on the supplement, not in the MTU summary layout. If the summary later needs a name column, that is a separate change.

## Risks / Trade-offs

- **Existing open Fire classes with a non-fire lead** → Block edits and finalization with an actionable message; provide a correction path that swaps or replaces roles. Production currently has only cancelled Fire classes, so active production risk is low.
- **A Fire class has no fire-qualified instructor at all** → Block the class and identify the lead requirement; staff must update a profile or assign a fire-qualified lead.
- **Multiple non-lead rows already exist from manual data** → Migration fails rather than guessing which is the assistant; resolve those rows before migrating.
- **Supplement formatting and pagination** → Test with long names and missing FFN/level values; keep the page table-driven and reproducible from the snapshot.
- **E16 two-name field overflow** → Fit or shrink the instructor-name value within the field instead of allowing it to overflow.
- **New certificate-email fingerprint behavior** → Include every instructor's name and role so adding or renaming an assistant or additional instructor resends the email.
- **Legacy pending Fire signatures remain** → Keep the legacy resolver and signing path until historical revisions no longer need it; do not route new revisions through it.
- **MTU report does not name instructors** → Accepted for this change; the supplement is the name-level documentation.

## Migration Plan

1. Add `is_assistant` to `class_instructors`, the one-assistant partial unique index, and the role-exclusivity check.
2. Backfill existing non-lead rows as assistants. Verify each class has at most one non-lead before applying; stop if any class has multiple.
3. Deploy role-aware reads and writes while retaining legacy PDF and attestation readers.
4. Enforce the fire-qualified lead rule for new and edited Fire classes; identify existing open violations before rollout.
5. Enable multi-instructor creation and the instructor supplement.
6. Remove the new-class pending Fire-signature behavior only after the new path is live; keep legacy handling.

Rollback: revert the application to the previous revision. The additive role column remains harmless; if the migration must be rolled back, drop the new index and column after confirming no new multi-instructor data would be lost.

## Open Questions

None. The MTU summary name list is explicitly deferred; the official-form two-slot layout and the supplement are fixed by the specs.

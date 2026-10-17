## Context

`class_instructors` already stores any number of instructors per class with an `is_lead` flag and a partial unique index that permits at most one lead (`src/server/db/schema/classes.ts:168`). The service `assignClassInstructor(…, isLead)` supports non-lead rows (`classes/services.ts:1097`), and downstream output already knows about "assisting" instructors (certificates, notices, notifications, audit labels). The gaps are all upstream:

- Class creation inserts exactly one instructor — the lead (`services.ts:815`); the wizard has a single instructor select.
- `InstructorAssignmentForm` hard-codes `isLead=true`, so no screen ever assigns a non-lead instructor.
- The Fire roster (`official-roster-pdfs/service.ts:318`) and the signing flow (`roster-signing`, `finalization.ts:115`) assume the class lead is the fire-qualified signer.

A **fire instructor** is defined here as a staff member with both a valid Fire Commission FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3) — the two Fire attributes stored by `instructor-profiles`.

## Goals / Non-Goals

**Goals:**
- Assign zero or one assistant instructor at creation and on an open class (add / change / remove).
- Let a Fire class be led by a non-fire instructor when an assisting fire instructor is present.
- Make the fire instructor the roster signer, and show their name at the top of the KFS-1A with their signature.
- Surface the class to the signing instructor on their own workspace.

**Non-Goals:**
- More than one assistant instructor.
- Changing instructor profiles or how FFN / certification level are captured.
- Any change to KBEMS or non-Fire output beyond the shared "signing instructor" resolution.

## Decisions

**Reuse `class_instructors`; enforce "at most one assistant" in the service, not the schema.**
The table already supports multiple non-lead rows, so no migration is required. The service treats the class as having one lead and at most one assistant: assigning an assistant replaces any existing assistant, and removing clears it. *Alternative considered:* a partial unique index `(class_id) WHERE NOT is_lead` to enforce it in the database. Rejected for now to avoid a migration; the product rule is narrow and the service is the only writer. Revisit if a second writer appears.

**A pure resolver decides the signer.**
`resolveSigningInstructor(instructors)` returns the lead when the lead is a fire instructor; otherwise the assistant when the assistant is a fire instructor; otherwise none (invalid Fire class). Used by the FFN guard, finalization access, the roster fill, the certificate, and the notice so they cannot disagree.

**The Fire requirement becomes "at least one fire instructor", not "every instructor".**
`requireFireInstructorFfns` (renamed in spirit) requires at least one assigned instructor who is a fire instructor. Non-signing assigned instructors are **not** required to hold Fire credentials. *Alternative considered:* keep "every instructor needs an FFN" and only swap the printed name. Rejected — the requirement's own example is a lead who is not a fire instructor at all.

**Only the signing instructor may finalize.**
`requireFinalizeAccess` admits the resolved signing instructor rather than strictly the `is_lead` row. A non-signing lead, a creator, a Training Major, or an Administrator still cannot finalize. A Fire class with no fire instructor cannot reach finalization because it cannot be created.

**Assistant assignment reuses the existing service, with one new guard.**
Adding/changing/removing the assistant uses `assignClassInstructor(…, isLead=false)` plus a clear operation; it never touches the lead. The lead-assignment path keeps its current "demote everyone, promote target" behavior, which correctly vacates the assistant slot if the assistant is promoted to lead. New guard: an instructor cannot be both, so assigning the assistant as the lead, or a lead as the assistant, is rejected rather than silently leaving a slot empty.

**The assistant picker offers every active staff member.**
`listClassFormOptions.staff` already returns all active users (administrators, training majors, instructors), so the picker excludes only the currently selected lead.

**Downstream documents follow the signer.**
The KFS-1A lead position, FFN, level, and signature, the completion certificate signature, and the training notice instructor name/FFN all resolve to the signing instructor.

## Risks / Trade-offs

- **[Signing instructor's workspace]** An assistant who is an Administrator or Training Major lands in the admin workspace (`workspaces.ts:9`), not `/staff/instructor`, so "their instructor page" may not be where they look. → Mitigation: rely on the existing assigned-scope operational dashboard on both workspaces; confirm placement with the department. Flagged as an open question.
- **[Removing the fire instructor]** Changing or removing the assistant on a Fire class could leave no fire instructor. → Guard the change/removal so a Fire class always retains a fire instructor, mirroring the creation rule.
- **[Re-finalization]** Reopening and re-finalizing recomputes the signer from current instructors and records a fresh attestation, consistent with today's per-revision signing.
- **[Service-only invariant]** Nothing stops a future code path from inserting a second non-lead row. → Accepted for now; noted above.

## Migration Plan

No schema change and no data backfill. Existing classes keep their single lead; they simply gain the ability to hold an assistant. Deploy is a normal `dev → main` promotion.

## Open Questions

- When both the lead and the assistant are fire instructors, does the lead sign (assumed) or is another rule intended?
- Where should an Administrator or Training Major who is an assisting signer see the awaiting-signature class?
- Does the non-signing instructor need any Fire credential at all (assumed: no)?

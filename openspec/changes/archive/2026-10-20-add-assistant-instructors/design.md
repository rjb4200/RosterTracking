## Context

`class_instructors` already stores any number of instructors per class with an `is_lead` flag and a partial unique index that permits at most one lead (`src/server/db/schema/classes.ts:172`). The service `assignClassInstructor(…, isLead)` supports non-lead rows (`classes/services.ts:1227`), and downstream output already knows about "assisting" instructors. The gaps are all upstream:

- Class creation inserts exactly one instructor — the lead (`services.ts:815`); the wizard has a single instructor select.
- `InstructorAssignmentForm` hard-codes `isLead=true`, so no screen ever assigns a non-lead instructor.
- The Fire guard (`classes/instructor-ffn.ts`) requires a valid FFN on every assigned instructor, and the finalization access and Fire roster assume the class lead is the fire-qualified signer.
- `assignClassInstructor(isLead=true)` demotes every other lead rather than replacing the old lead, so promoting the assistant leaves the old lead as a second non-lead assignment (`services.ts:1280-1292`).
- `finalization_revisions` is immutable (`ON UPDATE DO INSTEAD NOTHING`), so the Fire attestation cannot be appended by updating the revision. It is stored in a separate append-only table keyed by the revision.

A **fire instructor** is defined here as a staff member with both a valid Fire Commission FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3).

## Goals / Non-Goals

**Goals:**
- Assign zero or one assistant instructor at creation and on an open class.
- Replace the lead without demoting the old lead into the assistant slot.
- Let a Fire class be led by a non-fire instructor when an assisting fire instructor is present.
- Keep the class lead as the only finalizer.
- Let the Fire signer attest the Fire roster and notice, at finalization when they are the lead or afterward when they are the assistant.
- Generate the Fire roster and notice only after the Fire attestation.
- Surface the pending Fire signature to the Fire signer.

**Non-Goals:**
- More than one assistant instructor.
- Changing the completion certificate, which remains the class lead's document.
- Changing the lead-only finalization rule.
- A general per-document attestation model, pending-signature indicators on the class list, or signature reminders; `add-per-document-signing` adds those.

## Decisions

**Reuse `class_instructors`; enforce exactly one lead and at most one assistant in the service, not the schema.**
The table already supports multiple non-lead rows, so no migration is required. The service treats the class as having one lead and at most one assistant. Assigning a lead replaces the previous lead and does not demote them into the assistant slot. Setting an assistant replaces any existing assistant; clearing removes it. *Alternative considered:* a partial unique index on `(class_id) WHERE NOT is_lead`. Rejected for now to avoid a migration; the service is the only writer. Revisit if a second writer appears.

**A pure resolver decides the Fire signer.**
`resolveFireSigner(instructors)` returns the lead when the lead is a fire instructor; otherwise the assistant when the assistant is a fire instructor; otherwise none. It is used by the Fire guard, the Fire attestation, the roster fill, and the notice so they cannot disagree. The lead's finalization status is separate and does not depend on this resolver.

**The Fire requirement becomes "at least one fire instructor", validated against the resulting set.**
`requireFireInstructorFfns` requires at least one assigned instructor who is a fire instructor. Non-signing assigned instructors are not required to hold Fire credentials. Every mutation validates the assignment set that will exist after the write, not the current set plus the new instructor. *Alternative considered:* keep "every instructor needs an FFN" and only swap the printed name. Rejected — the motivating example is a lead who is not a fire instructor at all.

**The lead finalizes; the Fire signer attests.**
`requireFinalizeAccess` stays lead-only. The lead's certification and typed name are the roster attestation. The Fire attestation is separate: when the lead is the Fire signer, the finalization action captures both; otherwise the Fire signer signs the locked revision afterward. *Alternative considered:* let the Fire signer finalize. Rejected because it changes the existing authority model and lets a non-lead lock the roster.

**The Fire attestation is append-only against the locked revision.**
The Fire signer reviews the finalized, locked roster and signs. The revision snapshot never changes; a `finalization_fire_attestations` row keyed by the revision records the signer, typed name, timestamp, and statement version. The KFS-1A and notice are generated only when it exists. *Alternative considered:* generate with a blank signature line. Rejected by the rule that a Fire roster cannot generate until signed by a fire instructor.

**The Fire reporting destination follows the attestation.**
Fire cannot be marked `entered` until the Fire attestation exists. The reporting queue names the pending signature as the blocker. This prevents reporting a document that does not yet exist.

**The Fire signer's workspace surfaces the action.**
The dashboard lists finalized classes with a pending Fire attestation for the Fire signer and offers "Sign Fire roster." Non-signers see the status but not the action.

**The revision model is intentionally minimal here.**
This change adds a `finalization_fire_attestations` table alongside the lead's existing revision signature. `add-per-document-signing` generalizes the storage to scope-keyed `roster` and `fire` attestations, adds the certificate/roster gate, and adds the class-list indicator and reminders. Keeping this change focused on the Fire workflow lets it land without rewriting every finalization surface.

**Assistant assignment reuses the existing service with new guards.**
The assistant path uses `assignClassInstructor(…, isLead=false)` plus a clear operation; it never touches the lead. The lead path replaces the old lead. New guards: an instructor cannot be both, and a Fire class must retain a fire instructor after the change. The assistant is chosen from the same active-staff list as the lead, excluding the current lead.

## Risks / Trade-offs

- **[Promotion semantics]** Replacing the lead removes the previous lead rather than demoting them. Staff who want a swap perform two changes. → State "Replace lead" in the UI so the removal is not surprising.
- **[Removing the only fire instructor]** Changing or clearing the assistant on a Fire class could leave no fire instructor. → Validate the resulting assignment set atomically and reject the change.
- **[Legacy Fire classes]** The fire-eligible predicate now requires a level, while the current guard requires only an FFN. A legacy Fire class whose lead has an FFN but no level becomes unsignable. → Audit production before deploying, add a readiness blocker for "no fire instructor," and backfill levels where needed.
- **[Legacy multi-assistant classes]** The post-class change allowed more than one non-lead assignment. → On the first assistant write, collapse to one; audit existing classes before enforcing the 1+1 rule.
- **[Fire signer unavailable]** The Fire attestation cannot be recorded. → The pending state is visible; an Administrator reopens and reassigns.
- **[KFS-1A Assisting FFN]** A non-fire lead printed in the Assisting fields may have no FFN or level. → Confirm the form accepts a blank Assisting FFN/level; otherwise leave those fields blank and document the exception.
- **[Reporting blocked by a pending signature]** → Show the pending signature as the blocker with the sign action, not a generic error.

## Migration Plan

1. Deploy the 1+1 assignment, the Fire guard, the Fire signer resolver, and the Fire attestation.
2. Audit production Fire classes for a lead with an FFN but no level, and for classes with more than one non-lead assignment.
3. Backfill certification levels where the department can supply them; otherwise leave the class in a visible "no fire instructor" readiness state and resolve it through reassignment.
4. No `class_instructors` schema change. Add the `finalization_fire_attestations` table; the storage is additive and the revision table stays immutable.
5. Deploy the Fire signer's dashboard action and the Fire reporting gate.
6. Rollback: revert the service/UI and leave the Fire attestation storage in place; existing revisions are unaffected.

**Production audit (2026-10-20):** the production database contains one class, reported to KBEMS and MTU, and no Fire classes; no class has more than one non-lead assignment. No backfill or reassignment is required before deploying this change.

## Open Questions

- Does the KFS-1A accept a blank Assisting FFN and certification level for a non-fire lead or assistant? (Assumed yes.)
- Should the Fire reporting gate show "awaiting signature" in the reporting queue, or only block the entered action? (Assumed both.)
- When the lead and assistant are both fire instructors, the lead signs (assumed). No selection UI is offered.

## Context

See proposal.md — Why. Two current facts shape the approach:

1. **Finalization access is wider than wanted.** `requireFinalizationAccess` (`src/modules/classes/finalization.ts:93-105`) admits the class creator, elevated roles (Training Major/Administrator), or any assigned instructor, and `finalization-reporting` codifies that. Reopen uses the same check.
2. **The KFS-1A signature and initials are fillable fields in the updated template.** The original approved template had no signature or initials controls. The template was updated to add `Text1` (the lead-instructor signature line), `Instructor Initials`, and `INITIALSRow1..25` (the attendee initials column), so the renderer fills real fields instead of drawing at coordinates. Students already produce a digital attestation at sign-in (`attendanceAttestations`), so a signed revision is a familiar concept.

## Goals / Non-Goals

**Goals:**
- Only the lead instructor finalizes, and finalizing captures a certified attestation.
- The KFS-1A shows the lead instructor's typed-name electronic signature and each attendee's derived initials.
- Reopen is Administrator-only and requires a note.

**Non-Goals:**
- Drawn or cryptographic (PKI) signatures; typed-name attestation only.
- Signatures or initials on KBEMS-E16 or completion certificates (those stay physically signed).
- Per-subject initials; one initials value per attendee.
- Changing who may view or generate official rosters.

## Decisions

**D1 — Attestation, not a drawn or PKI signature.** A certification action plus the lead instructor's typed name, with the signer identity, server timestamp, and a versioned attestation statement recorded on the revision. Lightest option that is auditable and renders as a name; alternatives (canvas image, X.509) add storage and verification complexity the requirement does not need.

**D2 — Lead instructor is the only finalizer; Administrators own reopen.** Matches the user's decision. This is **BREAKING** for Training Majors, Administrators, the class creator, and assisting instructors. Because a lead instructor who is unavailable would otherwise block finalization, the class remains editable while completed, so the lead can be reassigned; reopen stays as the Administrator escape hatch.

**D3 — Store signing facts on the revision row.** Add nullable columns to `finalization_revisions`: `signed_by_user_id`, `signed_by_name` (snapshot of the signer's display name at signing), `signed_at`, `attestation_version`. The attestation text is a fixed, versioned constant identified by `attestation_version`. Storing on the row (rather than only inside the encrypted snapshot) keeps the signing facts queryable and lets legacy revisions render with no signature. Snapshotting the name keeps the printed signature immutable even if the signer later renames.

**D4 — Populate the updated template's fields.** The updated KFS-1A provides `Text1` (lead signature line), `Instructor Initials`, and `INITIALSRow1..25` (attendee initials). The renderer fills these fields and then flattens, so no coordinate drawing is needed. The template asset, its checksum, and the mapping were updated together.

**D5 — Derive initials with a pure function.** `attendeeInitials(name)` returns the first letter of the first name followed by the first letter of the last name, uppercased with no separator ("Ada Lovelace" → "AL"); guest names are handled the same way; a missing part falls back to the available part. A pure function keeps this unit-testable and shared by the renderer.

**D6 — Fixed, versioned attestation statement.** One statement constant with a version id (for example `roster-attestation-001`, "I certify that this roster is complete and accurate to the best of my knowledge."), so a later wording change is a new version rather than a silent edit.

**D7 — Reopen keeps its existing shape, narrowed in actor.** The reopen flow already requires a non-empty reason; the change restricts the actor to Administrators and treats that reason as the required note.

**D8 — Legacy revisions degrade gracefully.** Initials derive from attendee names that exist in every snapshot, so they render for legacy revisions too. A revision with no signing facts renders the signature area blank.

## Risks / Trade-offs

- [Coordinate drawing drifts if the template changes] → the template is checksum-locked by `service.test.ts`; measure once and assert the rendered output in a test.
- [Lead-only finalize can strand a class] → the class is editable while completed, so the lead can be reassigned; Administrators retain reopen.
- [Removing TM/Admin finalize is a capability loss] → intentional and called out as BREAKING; confirm during review.
- [Signer name could change after finalization] → snapshot `signed_by_name` on the revision.

## Migration Plan

- Add the nullable signing columns to `finalization_revisions` via a migration; existing rows keep null signing facts and render blank signatures.
- No data backfill. Deploy code and migration together; rollback is reverting the commit and migration.

## Open Questions

- Exact attestation wording (a default is proposed in D6).

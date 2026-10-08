## Context

See proposal.md — Why. Current facts that shape the approach:

1. **Two document visual languages.** `review/page.tsx` renders a `member-list` for the sign-in record and audit log, then a nested `admin-section` with `OfficialRosterControls` and `CompletionCertificateControls`. `OfficialRosterControls` emits an `inline-form` block per form with a bold label, a View button, and an always-visible recipient input.
2. **Generation is logged on every request.** The official-roster API route writes `official_roster.generated` on every GET, and `generateCompletionCertificates` writes `completion_certificate.generated` on every generation. Viewing a PDF opens a tab, so each view adds a row.
3. **The audit trail is append-only and immutable** (the schema rejects mutation). `getClassAuditLog` assembles a class's trail from several predicates and joins `users` for the actor name; it does not currently select `actorUserId`.
4. **Reopen shares a component with finalize.** `FinalizationControls` renders the finalize form when the class is completed and the reopen form when it is finalized.

## Goals / Non-Goals

**Goals:**
- One consistent Documents list where every output is a peer row.
- Email recipient revealed only when requested.
- Reopen offered in a dedicated section at the end, only to operators who may reopen.
- Fewer, more meaningful audit rows for official outputs without losing the stored trail.

**Non-Goals:**
- No change to generated PDF content or templates.
- No database schema change or migration.
- No change to email-delivery auditing (still one row per send).
- No removal of any existing action or document.

## Decisions

**D1 — Collapse repeated generation at read time, not write time.** The audit trail is append-only and immutable, so a write-time "has this actor already generated this?" check would race when two views land together and could still store duplicates. Instead `getClassAuditLog` collapses the two generation actions when it assembles the log. The stored trail stays truthful and complete; only the presented log is condensed.
- *Alternatives:* write-time guard (races, no unique index); suppressing in the route only (certificates take a different path, so it would split the rule across two places).

**D2 — Collapse keys.** Official rosters collapse by `(revisionId, actorUserId, formType)`; completion certificates collapse by `(revisionId, actorUserId)`. Email deliveries (`official_roster.email.sent`) stay per send because each recipient matters.
- The query must select `actorUserId` (today only `actorName` is joined); names are not a safe key.

**D3 — The earliest generation survives the collapse.** Showing the first generation preserves "who generated this first" and keeps chronological ordering meaningful. *Alternative:* show the latest — rejected because the first generation is the fact worth keeping.

**D4 — Documents become one `member-list`.** Rows: class sign-in record, class audit log, KFS-1A roster, KBEMS-E16 roster, completion certificates. Roster rows reuse the existing `member-row` shape and add a progressive Email action. The completion-certificates row renders only when the latest finalized revision's destinations include KBEMS (the condition the page already uses).

**D5 — Progressive email with a single explicit send.** The roster row shows `[View] [Email]`. Choosing Email reveals the recipient field plus `[Send] [Cancel]`; Send submits and Cancel collapses. The explicit Email click plus Send is the confirmation, replacing today's separate confirm step. *Alternative:* keep the extra confirm-to-send step — rejected as redundant once the field is hidden by default.

**D6 — Split finalize and reopen controls.** `FinalizationControls` keeps the finalize form at the top (completed classes) and the finalized-state note. A new `ReopenControl` renders in a bottom `admin-section` titled "Reopen roster", and is only rendered when the viewer may reopen. *Alternative:* a placement prop on the existing component — workable but keeps two unrelated actions coupled.

**D7 — Certificate row visibility reuses existing data.** No new query; the page already has `latestRevision.destinations` with `systemCode`.

## Risks / Trade-offs

- [Collapsing hides repeat views] → the stored trail keeps every generation; a future "viewed" concept can be added without changing this decision.
- [Read-time collapse changes the audit PDF] → update `class-audit-log` service tests and the renderer fixtures to expect one row per actor/revision/form.
- [Removing the confirm-to-send step] → Send is explicit and Cancel is adjacent; low risk of accidental send.
- [Keying on actor] → use `actorUserId`, not display name, so identical names cannot merge rows.

## Migration Plan

No database migration. Deploy the code with the release; rollback is reverting the commit.

## Open Questions

None blocking. The collapse key and the surviving row are decided above.

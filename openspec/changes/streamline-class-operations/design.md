## Context

See `proposal.md` — Why.

Current state that shapes the approach:

- `classes.status` is `draft | open | completed | finalized | cancelled`. The wizard (`class-creation-wizard.tsx`) creates a **draft**; `updateClassDraft`, `saveClassComponent`, and `assignClassInstructor` all reject any status other than `draft`, so draft is the only editable window.
- Open-readiness validation (`validateClassReadiness`) requires a component, a lead instructor, a reporting system, and an active host agency — all of which the wizard already collects, so `Open class` adds no information.
- The class page (`classes/[id]/page.tsx`) renders differently per status and labels sections "Step 1..4", duplicating the wizard's fields through `ClassForm`.
- The live roster and manual add appear on both `classes/[id]` and `classes/[id]/roster`; credit/remove appears on `classes/[id]/roster` and `classes/[id]/review`.
- `listPublicOpenClasses` lists every open class with a public code, regardless of when it starts.
- Production holds zero draft rows (20 finalized, 4 open, 1 cancelled).

## Goals / Non-Goals

**Goals:**
- One obvious path: create a class → it is open → run it → finish attendance → correct and finalize.
- One class page whose primary action follows the class state.
- One home for each roster operation.

**Non-Goals:**
- Not removing manual attendance entry; it stays on the class page and the review step.
- Not changing sign-in, attendance snapshots, finalization, or reporting behavior beyond where corrections are triggered.
- Not changing the public short-code or token entry routes.
- Not adding a publish/scheduling concept; the display window replaces it.

## Decisions

### D1 — Create and open in one transaction; remove the draft state

The wizard's final action creates the class in `open` status inside one transaction: class row (with public code), initial component, host-agency link, reporting selections, lead instructor, and optional PIN. The existing readiness validation runs inside that transaction so a malformed submission creates nothing.

- **Why**: the wizard already gathers everything `Open class` validates, so the second step is pure friction. Making creation atomic also removes the "QR for a class that cannot accept sign-ins" confusion.
- **Alternatives**: auto-open when a draft becomes ready (implicit, surprising); keep the draft and only reorder the buttons (keeps the extra step).
- `draft` is removed from the status set and the `classes_status` check constraint. Zero rows use it, so no backfill; the migration only narrows the constraint.

### D2 — Three wizard steps

`Class` (course, delivery, site when required, start, hours, lead instructor, PIN) → `Reporting` (reporting systems, host agency, required-information preview) → `Review` (`Create & open`). Course selection still seeds default hours and reporting systems.

- **Why**: three decision groups instead of six, with the same review safety net. Each step maps to a question staff actually ask: *what/when/where*, *who reports*, *confirm*.
- **Alternatives**: a single page (fewest clicks, but loses the guided validation the spec requires); six steps with only the final button changed (leaves the friction).

### D3 — Setup edits are allowed while the class is open

`updateClass`, `saveClassComponent`, and `assignClassInstructor` accept `open` (and `completed` only for roster operations), and are rejected after finalization.

- **Why**: staff need to fix a wrong date, site, instructor, or agency after creating a class, and there is no draft window anymore.
- **Risk this creates**: changing **reporting systems** after students have signed in leaves those attendance rows without a matching requirement set. `getRosterReadiness` already reports "missing required reporting context" and `confirmAttendance` already rejects a changed requirement set, so the system surfaces the problem instead of silently accepting it. See Risks.
- **Alternatives**: lock course/agency/reporting at creation and allow only schedule/instructor (safer, but the user chose full editability); lock everything (harsh).

### D4 — Retire the standalone roster page; correct at the finish-attendance step

Delete `classes/[id]/roster` and its links. The class page keeps a **read-only** active roster plus manual add and the sign-in-record link. `AttendanceControls` (credited hours, removal) and the removed-attendance list live on the completed review step.

- **Why**: the roster page duplicated the class page's roster and the review page's controls. Corrections naturally belong after attendance closes, where the readiness checklist already lives.
- **Behavior change**: credit/removal is no longer possible while a class is `open`; staff press `Finish attendance & review` first. This is the user's explicit choice.
- **Alternatives**: split jobs (command screen = live, roster page = ledger); keep both (status quo).

### D5 — One class page, one primary action

The class page drops the "Step N" eyebrows and the duplicated `ClassForm`. Sections are: header (course, status, next action), setup details (editable while open), live block (count, sign-in access, roster) while open, review link while completed, read-only record + history once finalized. The primary button is state-driven: `Finish attendance & review` → `Finalize roster` → none.

- **Why**: a stable mental model — status plus one button — is what removes the need for training.
- **Alternatives**: keep status-specific layouts; keep the inline edit form separate from the wizard (two sources of truth).

### D6 — Public directory display window (−18h / +36h around the first session)

`listPublicOpenClasses` lists an open class only when its **earliest component** starts between `now − 36h` and `now + 18h`. The window bounds become named constants. Sign-in via a shared short code or token remains available regardless of the window.

- **Why**: create-and-open means a future class is technically live immediately; the window keeps the public landing page showing only classes that are actually happening, without reintroducing a draft/publish state.
- **Alternatives**: list all open classes (publishes future classes); a publish flag (reintroduces draft).
- **Note**: the window is on **display**, not on sign-in; instructors still control when to share the link/QR.

## Risks / Trade-offs

- **Reporting-system change after sign-ins** → attendance keeps its original requirement snapshots; `getRosterReadiness` flags "missing required reporting context" and `confirmAttendance` rejects a changed set. Staff resolve by re-signing affected students or restoring the original systems. Documented in the spec as an accepted consequence of D3.
- **Course/agency change on an open class** → attendance retains its own `agencyId` and snapshots, so history stays accurate; the class record reflects the new value going forward.
- **Create-and-open publishes a future class briefly** → mitigated by the D6 window (hidden until 18h before).
- **Losing in-class corrections** → staff must finish attendance before correcting credit or removing attendance; the review step shows a readiness checklist so nothing is finalized with errors.
- **Dead status value in types/tests** → remove `draft` from `ClassStatus`, status tone, list filters, and fixtures in the same change so no unreachable branches remain.

## Migration Plan

1. Land the schema migration narrowing `classes_status` (no rows to backfill), plus the create-and-open service and 3-step wizard.
2. Delete the roster route and repoint its links; move corrections to the review step; update the class page IA.
3. Add the directory display window and its constants.
4. Update unit, integration, and browser suites, including removing draft fixtures and the roster-page coverage.
5. **Rollback**: revert the commit; the constraint narrowing is reversible (widen the constraint back) and no data was migrated.

## Open Questions

None blocking. The manual-attendance removal the user deferred is a separate future change.

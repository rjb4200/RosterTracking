## Why

The `completed` state between finishing attendance and finalizing is easy to enter by accident and hard to leave: any operator who can manage classes can complete a class, but only its lead instructor can finalize it, so a non-lead who finishes attendance strands the class with no next action they are allowed to take. It is also easy for staff to hand-add attendance rows, which carry no attestation and therefore cannot stand as a valid sign-in. Collapsing completion into a lead-only finalize removes the limbo state and protects the signature semantics of attendance.

## What Changes

- **BREAKING**: Remove the `completed` class status. The life cycle becomes `open → finalized` (lead instructor only) and `open → cancelled`; reopening a finalized class returns it to `open`.
- Make finalization the single closing action: the lead instructor reviews, corrects, and signs the roster from the open class, and finalization closes public sign-in and locks the class in one step. There is no separate "finish attendance" state and no independent close-sign-in action; sign-in stays open until the class is finalized.
- The review screen serves both roles: for an open class it is the finalize-and-correct workbench, and for a finalized class it is the read-only record. A read-only Class details summary appears near the top of the screen.
- From the class list, a finalized entry opens the finalized record (the review screen) and an open entry opens the live command screen.
- **BREAKING**: Remove manual attendance entry. A participant is captured only through a valid, attested sign-in; staff-entered attendance rows have no signature and are no longer offered on the class page or the review step.
- Treat MTU usage as operational rather than part of the locked record: it stays editable on the review page, including after finalization. Official roster PDFs do not render MTU fields and keep their existing layouts and revision-based facts.
- Overdue reminders and operational dashboards track open classes; the completed state no longer exists to track.

## Capabilities

### New Capabilities
<!-- None: this change retires and retargets existing behavior. -->

### Modified Capabilities
- `class-management`: the life cycle no longer has a completed state; finalization is reached from open; editability and lifecycle actions follow the reduced state set; the class list no longer scopes or filters on completed.
- `live-class-command-screen`: the open class's single primary action becomes review-and-finalize; there is no completed state action; sign-in closes at finalization rather than at a finish-attendance step.
- `guided-roster-finalization`: the review screen serves an open class as the finalize-and-correct workbench and a finalized class as the read-only record; it presents a read-only Class details summary near the top; manual attendance correction is removed while credit adjustment and removal remain.
- `finalization-reporting`: finalization validates and signs an open class (no longer a completed one) and produces the immutable revision.
- `roster-signing`: the lead instructor finalizes and signs an open, roster-ready class.
- `instructor-roster`: manual attendance entry is removed as a capability; the roster, credit adjustment, and removal operate while a class is open and on the review step.
- `mtu-usage-tracking`: MTU usage is editable at any time including after finalization and is no longer preserved as a locked revision fact.
- `official-roster-pdfs`: explicitly preserve revision-based roster output independently of operational MTU edits.
- `operational-class-dashboards`: the overdue reminder and dashboard scopes cover open classes only.
- `class-sign-in-access`: the set of class statuses whose tokens never reveal class details drops the retired completed state.
- `class-audit-log`: the class audit trail reflects the reduced life cycle (no completed event).

## Impact

- **App**: `src/app/staff/(protected)/classes/page.tsx` (list link targets), `classes/[id]/page.tsx` (open command screen, finalized handling), `classes/[id]/review/page.tsx` (dual role, Class details summary, manual correction removal), `classes/lifecycle-controls.tsx`, `classes/finalization-controls.tsx`, `classes/roster-controls.tsx`, `classes/roster-actions.ts`, `classes/actions.ts`, `operational-class-dashboard.tsx`.
- **Modules**: `src/modules/classes/services.ts` (transition, list scopes, operational actions, dedicated MTU updates), `policy.ts`, `constants.ts`, `finalization.ts` (finalize from open, MTU no longer snapshotted), `src/modules/instructor-roster/services.ts` (remove manual add), `src/modules/class-audit-log`, `src/modules/class-sign-in-record`.
- **Data**: migration to drop `'completed'` from the `classes_status` check constraint and retire `completed_at`; existing completed rows (if any) must be resolved before deploy.
- **Tests**: `src/modules/classes/policy.test.ts`, `operational-dashboard.test.ts`, `class-audit-log/pdf.test.ts`, and e2e `confirm-and-finalize`, `instructor-roster`, `class-list-filters`, `finalization-reporting`, `live-roster`.
- **Access**: unchanged permission model; the lead-instructor rule already governs finalization and now governs the only closing action.

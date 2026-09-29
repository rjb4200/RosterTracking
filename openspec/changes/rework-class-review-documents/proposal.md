## Why

The completed/finalized class review screen mixes finalization, corrections, attendance, and printable outputs into one dense scroll, and buries each printable output inside a per-revision row behind redundant View/Print/Download links. Staff preparing Fire Commission and KBEMS submissions cannot quickly find the official rosters, completion certificates, sign-in record, or an audit trail for the class.

## What Changes

- Reorganize the review screen into clear sections: **Finalization**, **Documents**, **Revision history**, **Corrections**, and **Attendance**.
- Consolidate each printable document to a single **View** action that opens the rendered PDF inline; retire the separate **Print** and **Download** actions because the browser PDF viewer already provides them.
- Add a **Documents** section that surfaces, for the **latest finalized revision**: the KFS-1A roster, the KBEMS-E16 roster, and the completion certificates; plus the class sign-in record and a new class audit log (both available regardless of finalization).
- Add a **class audit log** capability: a detailed, printable PDF of the class's audit trail (class lifecycle, attendance changes, sign-in, finalization, and reporting/output events), gated by the roster access rule.
- Record the class id on the three sign-in student audit events that currently lack it so they can be scoped to a class. No historical backfill; the database currently holds test data only.
- Keep older revision outputs reachable behind the collapsed revision history.

## Capabilities

### New Capabilities
- `class-audit-log`: view and print a detailed, class-scoped audit-trail PDF.

### Modified Capabilities
- `guided-roster-finalization`: the completed and finalized review screen presents a Documents section for class outputs and uses one View action per document.
- `official-roster-pdfs`: official roster delivery is offered as one inline View action (plus email) rather than separate view, print, and download actions.

## Impact

- **App**: `src/app/staff/(protected)/classes/[id]/review/page.tsx` reorganized; `official-roster-controls.tsx` reduced to one View plus email; sign-in-record actions reduced to one View.
- **API**: new `src/app/api/staff/class-audit-log/[classId]/route.ts` following the existing staff PDF route pattern.
- **Modules**: new `src/modules/class-audit-log/` (service + PDF renderer + action label map); `src/modules/student-sign-in/attendance.ts` adds the class id to three audit details.
- **Data**: reads `audit_logs`, `finalization_revisions`, `training_classes`, and related tables; no new columns required.
- **Access**: the class audit log uses the roster access rule (assigned instructor, Training Major, or Administrator).

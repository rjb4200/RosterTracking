## Why

The review screen is the one place an instructor reconciles attendance and signs a class, yet it renders roughly a dozen flat sections in a single column. The sign action sits near the top while the records it depends on (attendance credits) sit near the bottom; empty sections always render (for example "Removed attendance (0)"); roster-readiness issues name raw attendance IDs; and a Mobile Training Unit class shows two identical MTU editors — one embedded in the finalize step and one in a separate "MTU usage" section. Instructors also cannot record a class that ran long: credited hours are capped at the class scheduled total, and raising a session's hours raises that ceiling without carrying the extra hours to the participants who were actually present.

## What Changes

- Reorganize the open-class review screen as an ordered checklist of cards — Attendance, Reporting & MTU, Sign & finalize — with documents, revision history, and corrections collapsed behind summaries.
- Add a class-ran-long adjustment: raising the class scheduled hours carries the new total to every active participant still at the previous total, leaving individually adjusted participants unchanged.
- Reduce the review screen to a single MTU editor — the confirmation inside the finalize step — and retire the separate operational MTU section.
- Render optional sections only when they have content, such as "Removed attendance" when a participant was actually removed.
- Name roster-readiness issues in operator terms (participant names) instead of raw attendance IDs.
- Not changing: the per-participant bound (credit remains zero through the scheduled total), sign-in defaults, destination-driven reporting, official roster and certificate PDFs, or the reopen path.

## Capabilities

### New Capabilities

<!-- None: this change reorganizes an existing screen and adjusts an existing credit rule. -->

### Modified Capabilities

- `guided-roster-finalization`: the review screen is organized as an ordered checklist of cards with collapsed secondary sections, hides sections that have no content, names readiness issues by participant, presents a single MTU editor at the finalize step, and offers the class-ran-long schedule adjustment.
- `instructor-roster`: raising the class scheduled total carries the new total to active participants still at the previous total, while individually adjusted participants keep their credited hours and reason.
- `mtu-usage-tracking`: MTU usage is recorded at finalization only; the review screen no longer maintains an independent operational MTU editor after the class is signed.

## Impact

- `src/app/staff/(protected)/classes/[id]/review/page.tsx` — rebuilt around ordered cards and collapsed sections.
- `finalization-controls.tsx`, `mtu-usage-form.tsx` — one MTU editor; the standalone form retired.
- `roster-controls.tsx`, `roster-actions.ts` — the class-ran-long adjustment action.
- `src/modules/instructor-roster/services.ts` — propagate the scheduled total to participants at the previous total.
- `src/app/globals.css` — card and checklist styles.
- No schema migration and no change to sign-in, output generation, or the reopen path.

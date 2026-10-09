## 1. Assets and mapping

- [x] 1.1 Add the Light-Yellow and White KFS-1B PDFs to `src/modules/official-roster-pdfs` with their SHA-256 checksums and template versions
- [x] 1.2 Add one shared KFS-1B `TemplateMapping` (student, instructor, five subject rows, session, total hours, signature) and select the yellow/white variant at render time

## 2. Snapshot

- [x] 2.1 Capture the class host agency and each attendee's represented agency identity in the finalization snapshot (optional so older revisions are unaffected)
- [x] 2.2 Replace the name-based agency read in the snapshot's attendance mapping with the agency identity while keeping the agency name for display

## 3. Renderer and eligibility

- [x] 3.1 Add an eligibility check: a class reporting to Fire with participants whose represented agency differs from the host agency
- [x] 3.2 Render a KFS-1B for a participant: name, FFN, lead instructor and FFN, subject category codes and hours, date, start time, location, total hours, and the attested typed-name signature; leave `Agency_Selection` blank
- [x] 3.3 Append the Yellow notices to the KFS-1A output so view, download, and email include them after the roster pages

## 4. Delivery

- [x] 4.1 Queue one White notice delivery per qualifying participant during finalization, in the same transaction
- [x] 4.2 Dispatch queued notice deliveries after commit, suppressing an unchanged notice and recording failures without affecting finalization
- [x] 4.3 Add resend for a participant's notice and surface qualifying participants without a deliverable email as delivery exceptions on the review screen

## 5. Tests and verification

- [x] 5.1 Unit-test eligibility, the notice field mapping, the attested signature, the yellow/white variant, and row fill order
- [x] 5.2 Integration-test queuing on finalize, no notices for a host-only or non-Fire class, and the appended Yellow pages
- [x] 5.3 Run `npm run check`, `npm run test`, the touched integration tests, and `npm run build`

## 6. Docs

- [x] 6.1 Replace the KFS-1B "deferred" notes in README and architecture, and record that `Agency_Selection` is left blank pending confirmation

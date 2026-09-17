## Why

Training Majors currently manage external Fire, KBEMS, and FEMA reporting through a generic configuration page. They need a destination-specific work queue that exposes pending workload, sufficient class context, and fast, auditable completion actions.

## What Changes

- Replace the generic reporting status form with a Training Major reporting work queue for finalized class revisions.
- Track each reporting destination independently with `pending`, `entered`, `needs_correction`, and `not_required` states.
- Provide destination and status workload summaries, filters, and contextual queue rows.
- Add one-step Mark entered and Mark not required actions that record the authenticated actor and server timestamp.
- Make the supported official roster PDF available directly from its corresponding queue item.
- Add end-to-end coverage for independent destination statuses and reporting completion.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `finalization-reporting`: Expand destination status tracking and replace generic reporting lists with an actionable Training Major queue.

## Impact

- Affected code: reporting page and controls, reporting queue queries and mutations, finalization reporting schema, and reporting tests.
- Existing stored `reported` statuses must migrate to `entered`.
- Existing official roster PDF endpoints and supported Fire/KBEMS form mappings are reused; FEMA does not gain a PDF because no FEMA form is supported.

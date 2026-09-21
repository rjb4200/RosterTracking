## Context

See `proposal.md` for motivation. Current state that shapes the approach:

- `/staff/classes` calls `listClasses` (`src/modules/classes/services.ts:847`), which takes only a text term, filters `ilike` on course or site, orders by `updatedAt desc`, and caps at 100. It selects no dates, no attendance, and no finalization data.
- `listOperationalClasses` (`src/modules/classes/services.ts:887`) already computes first session, final session, attendance count, finalized time, reporting destinations, a next action, and an overdue flag via correlated subqueries, ordering by first session ascending. That query shape is the reusable pattern.
- Access scoping is already inside the query: non-elevated actors only see classes they created or instruct.
- Theme tokens (`src/app/globals.css`) are a grayscale palette plus `--destructive`; there are no success, warning, or info tokens, and dark mode mirrors the same token names.
- The `Badge` component (`src/components/ui/badge.tsx`) exposes `default`, `secondary`, `destructive`, `outline`, `ghost`, and `link`.
- The reporting queue recently established the search-parameter filter pattern (read `searchParams`, validate, pass to the service, preserve values via `defaultValue`).

## Goals / Non-Goals

**Goals:**
- One server-side query that applies the default scope, the filters, and the exemptions so the rows and any counts describe the same authorized set.
- Lifecycle state readable at a glance without depending on color.
- Filter state expressed in the URL so a scoped list is shareable and reloadable.

**Non-Goals:**
- Adding a session date column to the list table.
- Changing how the role dashboards present overdue.
- Introducing saved filter preferences or per-user defaults.
- Pagination beyond the existing row cap.

## Decisions

### Default lookback of 30 days with no forward bound
The default session window starts 30 days before today and has no end date, so upcoming classes are never hidden while old history stays out. A symmetric ±30-day window was rejected because it would hide legitimately scheduled classes, and a calendar-month window was rejected for awkward month-edge behavior. The lookback is a single named constant so it can be tuned without touching the query shape.

### Scope and exemptions computed in SQL, not in the page
The default scope, date range, status selection, and the unfinalized-with-students exemption are applied in the `listClasses` query. Filtering in the page would break the "rows and counts describe the same set" property and would not compose with the 100-row cap.

### Pin rule expressed as an exemption on the date predicate
A class is exempt from the session window when it is not finalized and has at least one active attendance record:

```
in_window OR (not finalized AND active_attendance > 0)
```

Because completion already requires an active attendance record, in practice every `completed` class is pinned until finalized, and an `open` class with early sign-ins is pinned too. This is deliberately conservative: work in flight cannot disappear.

### Draft recency uses creation time
Drafts are scoped by `createdAt` rather than session date, because a draft usually has no session. The seven-day cutoff means older drafts are hidden by default and reachable only by widening filters, which matches the expectation that rosters are normally created on the class day. Sessions are not required for this rule, so a draft with no components is still scoped.

### Filters travel as validated search parameters
`status`, `from`, `to`, `includeFinalized`, and `includeCancelled` are read from `searchParams`, validated against known values, and passed to the service, mirroring the reporting queue. Invalid values fall back to defaults rather than erroring, and controls preserve current values so filters compose.

### Status color uses new theme tokens, not inline utilities
Add `--success`, `--warning`, and `--info` tokens with `--color-*` bindings and dark-mode values, then extend `Badge` with matching variants. Inline color utilities were rejected as drift-prone and hard to keep consistent across the list and dashboards. Tinted-background-with-same-hue-text is the required pattern so contrast survives in both themes.

### Left rail plus tinted badge for redundant coding
Status is shown as a colored left rail on the row and a tinted badge with the written state. The rail makes the color scannable as a vertical strip; the badge keeps the state legible at close range and reinforces the color for anyone who cannot rely on the rail alone. Overdue renders as a separate marker beside the status instead of replacing it, which differs from the dashboard today and is scoped to the list for now.

### Recently finalized is a section, not a filter
The same query result is split into "Active" and a "Recently finalized" section by status plus the seven-day grace window, so the finished pile can be absent entirely when empty.

## Risks / Trade-offs

- [A stale `open` class whose session is old and which has no students is hidden by the default window] → Accepted; it is reachable by widening the date filter, and such a class is arguably abandoned work rather than active work.
- [A draft created weeks ahead for a future class is hidden after seven days] → Accepted per product direction; discovered through the filters. Flagged so it can be revisited if scheduled-ahead drafting becomes normal.
- [The 100-row cap can silently truncate a widened list] → Consider surfacing a truncation notice or raising the cap; recorded as an open question rather than decided here.
- [New color tokens can regress contrast] → Keep the tinted-background pattern, verify both themes, and keep the written status present so color is never the only signal.
- [Overdue now appears differently on the list than on the dashboards] → Deliberate and scoped; aligning the dashboards would be a separate change.

## Migration Plan

No data migration. The query, page, and tokens deploy together; rollback is a revert of those changes. There is no persisted state to unwind because filter selection lives only in the URL.

## Open Questions

- Should `open` classes be explicitly exempt from the date window, or is the absence of a forward bound sufficient? The current design does not need the exemption, so this can be settled during implementation.
- Should the row cap gain a visible truncation affordance, or is a raised cap enough?

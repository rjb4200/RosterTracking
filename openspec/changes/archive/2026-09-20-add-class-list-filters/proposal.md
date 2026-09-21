## Why

The staff class list (`/staff/classes`) shows every class in one undifferentiated, newest-edited-first list. Operators must scroll past finished and cancelled work to find classes that need attention, and every status renders as the same gray badge, so lifecycle state is not scannable at a glance.

## What Changes

- Default the list to an operational scope: open, completed, and fresh drafts created within seven days, plus classes finalized within the last seven days.
- Apply a recent-session date window by default, so older history stays out of the list until the operator widens or clears the date filter.
- Always keep a class that has active students on its roster and is not yet finalized, regardless of the date window, until it is locked by finalization.
- Hide finalized and cancelled classes unless the filters explicitly include them.
- Hide drafts older than seven days, measured from the class creation date; a hidden draft remains reachable by widening the filters, which is expected to be rare because rosters are normally created on the class day.
- Separate recently finalized classes into their own "Recently finalized" section for a seven-day grace window so instructors can confirm a finished roster briefly without keeping it in the active list.
- Add filters for status, session date range, and opt-in inclusion of finalized and cancelled classes, while keeping the existing course/site search. The date filter is applied by default rather than starting empty.
- Mark status with a colored left rail plus a tinted status badge using a lifecycle color ramp, and show overdue as a separate marker beside the status instead of replacing it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `class-management`: The class list SHALL default to a scoped operational set, provide status, date, and inclusion filters, separate recently finalized classes, and present status and overdue as scannable indicators.

## Impact

- Affected code: the staff classes page, the `listClasses` read, the shared badge component, and theme color tokens (a neutral-only palette today), plus a possible shared class-status tone helper used by the list and dashboards.
- Query impact: `listClasses` must select creation, session, and finalization dates to scope and filter the list.
- Behavior risk: the default date window and the seven-day draft cutoff must never hide in-flight work. Drafts older than seven days are intentionally hidden but stay reachable through the filters, and a class that has active students and is not yet finalized is exempt from the date window until it is locked.
- Accessibility: status color must never be the only signal. The status word stays present, overdue keeps a text label, and tinted badges must preserve AA contrast in both light and dark themes.
- Not included: a session-date column on the list, and any change to the role dashboards' overdue presentation.

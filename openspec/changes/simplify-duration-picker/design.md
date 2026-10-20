## Context

The shared `DurationFields` component currently renders two native selects, one for hours and one for minutes. The global `.select-input { width: 100% }` rule makes each select stretch inside its flex label, so the pair wraps and reads as two full-width fields when the surrounding column narrows. The component is used by class creation, session editing, and the post-class workspace.

The stored value is decimal hours (for example `2.5`), and the server accepts any positive value up to 999 hours but derives end times only on 15-minute boundaries. The current picker caps the UI at 24 hours.

## Goals / Non-Goals

**Goals:**

- Make one choice produce one duration.
- Keep the control compact enough that it does not stretch or stack.
- Present durations in the same language as the rest of the app (`2h 30m`).
- Preserve existing session values that fall outside the new offered range.
- Keep the shared control consistent across class creation and session editing.

**Non-Goals:**

- Changing the decimal storage format, server validation, or database schema.
- Changing how session start times, end times, or credited hours are calculated.
- Adding a custom duration popover, time picker, or new dependency.
- Restricting durations submitted by other code paths.

## Decisions

### One native select, not a custom picker

Use a single `<select>` populated with every 15-minute duration from `30m` through `16h` (63 options).

Alternatives considered:

- **Two selects in one row**: still two decisions, and the width problem remains.
- **Native `input type="time"`**: time-of-day semantics, wraps at 24 hours, and accepts typed minutes outside the 15-minute cadence.
- **Custom two-column popover**: the most compact visually, but adds focus management, keyboard handling, and mobile behavior for little gain.
- **Datalist combobox**: allows arbitrary text and needs parsing rules; the native select already enforces the valid set.

A native select keeps keyboard access, mobile pickers, and typeahead for free.

### Range: 30 minutes through 16 hours

Observed session data in the dev database ranges from 1h to 4h. A `30m`–`16h` range covers normal classes and halves the option count compared with `15m`–`24h`. The default remains `2h`.

The server continues to accept its existing 15-minute-increment values, including `15m` and durations above `16h`, because the range is a picker constraint rather than a validation change.

### Labels use `formatHours`

Options read `30m`, `45m`, `1h`, `1h 15m`, `2h 30m`, `16h`. This matches the review, roster, and certificate output and avoids introducing a second duration vocabulary.

### Out-of-range current values get a synthetic option

When editing a session whose stored duration is outside the offered range, prepend or append an option for that exact value, labelled as the current duration. Selecting another option replaces it normally. New classes and new sessions never see the synthetic option.

This prevents a `15m` or `20h` session from silently rendering as a different duration or being clamped when saved.

### Keep the decimal submission

The select can carry decimal values directly, or stay controlled with the existing hidden decimal input. Either way, `creditedHours` remains decimal hours. No server or schema change is needed.

### Compact width replaces the flex layout

Give the duration select an explicit compact width (roughly `9rem`–`12rem`) instead of inheriting `width: 100%`. Remove the `.duration-fields` flex rules and the now-unused hours/minutes structure. Keep `.field-label` because the delivery and method checkbox groups still use it.

The visible field label remains `Scheduled duration` in class creation and `Credited hours` in session editing, and becomes the select's accessible name.

## Risks / Trade-offs

- **63 options is a long menu** → Native typeahead and the fact that common durations cluster near the top keep it usable. If scanning proves painful, group options by hour with `<optgroup>` later without changing the value model.
- **The picker no longer offers 15-minute sessions** → Intended. The server still accepts them, and the synthetic current-value option preserves existing data.
- **Sessions above 16 hours cannot be shortened to an arbitrary out-of-range value** → They can still be edited to any value in the offered range; the current value stays available as a fallback.
- **Two accessible names could appear if the hidden input is labelled** → Keep the hidden input out of the accessibility tree (no label, `aria-hidden` where appropriate) and label only the select.
- **Existing browser tests target the old hours/minutes labels** → Update them to the single label as part of the change.

## Migration Plan

No database migration. This is a UI-only change. Existing stored durations are read and matched to options; out-of-range values get the synthetic option. Rollback is a UI revert with no data cleanup.

## Open Questions

None.

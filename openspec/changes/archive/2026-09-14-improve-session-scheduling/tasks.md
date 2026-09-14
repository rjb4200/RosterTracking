## 1. Session Scheduling Rules

- [x] 1.1 Add shared validation and calculation for quarter-hour component starts, quarter-hour credited hours, and credit-hour-derived end timestamps.
- [x] 1.2 Update component persistence so the server calculates and stores the end timestamp from the validated start time and credited hours.
- [x] 1.3 Add unit coverage for valid and invalid start increments, credit-hour increments, defaults, and calculated end timestamps.

## 2. Staff Session Form

- [x] 2.1 Default a new session start to the current department time rounded to a quarter hour and credited hours to `2.00`.
- [x] 2.2 Restrict the start-time input to 15-minute increments and credit-hours input to quarter-hour increments.
- [x] 2.3 Replace manual end-time editing with a calculated, read-only end-time display that updates when start time or credited hours change.
- [x] 2.4 Keep existing component values visible during editing while applying the calculated-end rule on save.

## 3. Verification

- [x] 3.1 Add service and form tests covering newly added and edited sessions, including the optional session-title fallback behavior in roster output.
- [x] 3.2 Run linting, type checking, unit tests, and the relevant end-to-end staff class workflow tests.

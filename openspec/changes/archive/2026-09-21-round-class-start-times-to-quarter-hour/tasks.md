## 1. Shared rounding primitive

- [x] 1.1 Confirm `roundDepartmentDateTimeToQuarterHour` rounds to the nearest quarter hour in department local time and covers the next-day roll, adding a case to `time.test.ts` for a roll past midnight.

## 2. Domain normalization

- [x] 2.1 Normalize the class start time in the class-creation input schema so a submitted time that is not a whole 15-minute increment is stored as the nearest 15-minute value.
- [x] 2.2 Normalize the session start time in the component input schema the same way.
- [x] 2.3 Confirm the same-day session rule still rejects a session that rolls to another department-calendar day, and that it reports a normal validation error.

## 3. Visible entry

- [x] 3.1 Add a 15-minute step to the create-class Date and start time input.
- [x] 3.2 Default the create-class start time to the nearest quarter hour.
- [x] 3.3 Round the create-class start time on change and write the rounded value back into the field.
- [x] 3.4 Round the session Starts input on change and write the rounded value back, matching its existing picker step.

## 4. Verification

- [x] 4.1 Unit-test the rounding primitive for nearest rounding, the :07 and :08 boundary, and the next-day roll.
- [x] 4.2 Unit-test that the class and session input schemas normalize an off-grid start time.
- [x] 4.3 Browser-test that typing an off-grid start time in the wizard shows the rounded value and stores it.
- [x] 4.4 Browser-test that the create-class start time defaults to the nearest quarter hour.
- [x] 4.5 Run `npm run check`, `npm run test`, the integration suite, and the browser suite.

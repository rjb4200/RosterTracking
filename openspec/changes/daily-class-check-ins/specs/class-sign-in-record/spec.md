## ADDED Requirements

### Requirement: Daily check-ins are grouped by date

For an initial-certification program class, the Class sign-in record SHALL present daily check-ins grouped by class date and SHALL retain the existing entry layout within each date. A date with no check-ins SHALL not appear. A date's entries SHALL continue on another page when they do not fit.

#### Scenario: Present multiple program dates

- **WHEN** the record is opened for a program with three check-in dates
- **THEN** it shows the three dates with each date's entries under that date

#### Scenario: Continue a full date

- **WHEN** one date has more entries than fit on a page
- **THEN** the record continues that date on the next page

#### Scenario: Omit a day with no check-ins

- **WHEN** no one checked in on a calendar date during the program
- **THEN** the record does not show that date

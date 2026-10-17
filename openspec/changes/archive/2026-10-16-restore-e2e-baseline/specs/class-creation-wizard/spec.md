## ADDED Requirements

### Requirement: Searchable catalog controls expose unambiguous accessible names

The system SHALL give the filter input and the value input of each searchable catalog control distinct accessible names, so that a query for the value control by name resolves to exactly one element. The value control's accessible name SHALL NOT contain a required-marker glyph; required state SHALL instead be exposed to assistive technology through the control's required state (`aria-required` or the native `required` attribute).

#### Scenario: Filter and value controls are distinguishable by name

- **WHEN** a searchable catalog control renders its filter input and its value input
- **THEN** the two expose different accessible names, and a name-based query for the value control matches only that control

#### Scenario: Required state is not carried in the accessible name

- **WHEN** a searchable catalog control's value is required
- **THEN** the value control's accessible name contains no required-marker glyph and the control is exposed as required to assistive technology

#### Scenario: Filtering still auto-selects the first match

- **WHEN** staff type into a searchable catalog control's filter
- **THEN** the value control still selects the first matching option, and keeps its current selection when the filter matches nothing

## ADDED Requirements

### Requirement: Filtering a search control selects the first match

When staff type into a wizard search control's filter, the system SHALL select the first matching option so the control reflects the filter, and SHALL keep the current selection when the filter matches nothing.

#### Scenario: Select the first match
- **WHEN** staff type a filter that matches one or more options
- **THEN** the control selects the first matching option

#### Scenario: Keep the selection when nothing matches
- **WHEN** staff type a filter that matches no options
- **THEN** the control keeps its current selection

#### Scenario: Leave the selection unchanged when the filter is cleared
- **WHEN** staff clear the filter
- **THEN** the control's selection is unchanged

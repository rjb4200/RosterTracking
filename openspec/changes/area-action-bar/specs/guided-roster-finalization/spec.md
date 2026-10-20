## ADDED Requirements

### Requirement: Area editors share one action bar

The workspace SHALL present the close and save actions for a draft editor together in the area header, and SHALL NOT render a submit control inside the editor body.

When an operator opens an area whose contents are drafted, the header that showed **Edit** SHALL show **Close** and **Save and close** side by side. Choosing **Save and close** SHALL submit the open editor's form. When the save succeeds the area SHALL close and its summary SHALL reflect the saved values. When the save is rejected the area SHALL stay open, keep the operator's values, and show the error.

An area whose controls take effect immediately SHALL show **Close** only, and SHALL keep those controls in the body without a save action. The instructor area is such an area: assigning a lead, removing an assistant, or adding an instructor SHALL continue to take effect on the action itself.

The schedule area SHALL list sessions as read-only rows with an affordance to edit each session and a control to add a session. It SHALL open one session editor at a time and SHALL edit a new session through that same editor. The header action bar SHALL save the session editor that is open.

#### Scenario: Save and close from the header

- **WHEN** the operator opens class details, changes a value, and chooses **Save and close**
- **THEN** the class is saved, the area closes, and its summary shows the saved value
- **AND** no submit button is present inside the editor body

#### Scenario: A rejected save keeps the editor open

- **WHEN** the operator chooses **Save and close** and the save is rejected
- **THEN** the area stays open with the operator's values
- **AND** the error is shown in place

#### Scenario: Close without saving

- **WHEN** the operator opens an area, changes nothing, and chooses **Close**
- **THEN** the area closes without submitting
- **AND** reopening it shows the values stored on the server

#### Scenario: The instructor area offers no save

- **WHEN** the operator opens the instructor area
- **THEN** the header shows **Close** only
- **AND** making an instructor the lead, removing an assistant, or adding an instructor takes effect immediately

#### Scenario: One session is edited at a time

- **WHEN** the operator opens the schedule area and chooses to edit a session
- **THEN** one session editor is open and the other sessions remain read-only rows
- **AND** choosing another session replaces the open editor
- **AND** adding a session opens the editor for a new session

### Requirement: Discarding unsaved edits is confirmed

When a draft editor holds unsaved changes, closing it or switching to another area SHALL ask the operator to confirm discarding those changes. Confirming SHALL discard them and complete the requested close or switch. Cancelling SHALL keep the editor open with its values.

#### Scenario: Closing with unsaved changes asks first

- **WHEN** the operator has changed a field and chooses **Close**
- **THEN** the operator is asked to confirm discarding the changes
- **AND** confirming closes the area and cancelling keeps the values

#### Scenario: Switching areas with unsaved changes asks first

- **WHEN** the operator has changed a field and chooses to edit a different area
- **THEN** the operator is asked to confirm discarding the changes
- **AND** confirming opens the requested area and cancelling stays on the current one with its values

#### Scenario: Saving does not ask

- **WHEN** the operator chooses **Save and close** and the save succeeds
- **THEN** the area closes without a discard prompt

#### Scenario: An untouched editor closes without a prompt

- **WHEN** the operator opens an area and closes it without changing anything
- **THEN** no discard prompt appears

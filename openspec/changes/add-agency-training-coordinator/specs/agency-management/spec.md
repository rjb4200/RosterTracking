## ADDED Requirements

### Requirement: Agency records may carry a training coordinator contact

The system SHALL let each agency record a training coordinator as a contact distinct from the
agency's general contact, consisting of a coordinator name, a phone number, and an email address.
All three coordinator fields SHALL be optional, and the system SHALL store them separately from the
agency's general contact name, phone, and email.

#### Scenario: Record a coordinator when creating an agency
- **WHEN** authorized staff create an agency with a training coordinator name, phone number, and email address
- **THEN** the system stores the coordinator details on the agency

#### Scenario: Change a coordinator when editing an agency
- **WHEN** staff edit an agency and supply different coordinator name, phone, and email values
- **THEN** the system stores the updated coordinator details on the agency

#### Scenario: Coordinator is optional
- **WHEN** staff save an agency without entering any training coordinator details
- **THEN** the system saves the agency with no coordinator details

#### Scenario: Coordinator is separate from the general contact
- **WHEN** an agency carries both a general contact and a training coordinator
- **THEN** the system stores the two sets of details independently

### Requirement: Training coordinator contact values are validated

The system SHALL validate a training coordinator's contact details when a value is supplied. A
supplied coordinator phone number SHALL be accepted only when it is a valid US 10-digit number, and
a supplied coordinator email address SHALL be accepted only when it is in a valid email format.
Blank coordinator fields SHALL be accepted without error.

#### Scenario: Reject an invalid coordinator phone number
- **WHEN** staff supply a coordinator phone number that is not a valid US 10-digit number
- **THEN** the system rejects the save and reports that the phone number is invalid

#### Scenario: Reject an invalid coordinator email
- **WHEN** staff supply a coordinator email address that is not a valid email format
- **THEN** the system rejects the save and reports that the email is invalid

#### Scenario: Accept a valid coordinator phone number
- **WHEN** staff supply a coordinator phone number of a valid US form, such as `(859) 555-1234`
- **THEN** the system accepts the save and stores the number as `+18595551234`

#### Scenario: Accept blank coordinator fields
- **WHEN** staff supply a coordinator name but leave the coordinator phone and email blank
- **THEN** the system accepts the save without a phone or email validation error

## Purpose

Capture the lead instructor's electronic attestation when a class is finalized and present it — together with each attendee's derived initials — on the printed Fire roster, so a finalized roster carries a named, timestamped record of who verified it.

## ADDED Requirements

### Requirement: Finalizing requires the lead instructor's attestation

The system SHALL require the class's lead instructor to finalize a completed class and SHALL capture, at that moment, an explicit certification action and the lead instructor's typed name. The system SHALL record the signer identity, the server timestamp, and the attestation statement with a version identifier on the created finalization revision.

#### Scenario: Sign while finalizing
- **WHEN** the class's lead instructor finalizes a roster-ready completed class and certifies the roster
- **THEN** the system records the certification, the lead instructor as signer, the server timestamp, and the attestation statement with its version on the new revision

#### Scenario: Refuse to finalize without certification
- **WHEN** the lead instructor submits finalization without the certification
- **THEN** the system refuses to finalize and identifies the missing certification

#### Scenario: Refuse a non-lead finalizer
- **WHEN** a Training Major, Administrator, the class creator, or an assisting instructor attempts to finalize the class
- **THEN** the system denies the finalization

#### Scenario: Capture a fresh signature on each finalization
- **WHEN** a finalized class is reopened and finalized again
- **THEN** the new revision records a fresh attestation, signer, and timestamp, and the prior revision keeps its own

### Requirement: The Fire roster presents the lead instructor's electronic signature

The system SHALL present the lead instructor's electronic signature on the Fire roster as a typed-name line that names the signer, derived from the finalization revision's signing facts rather than the instructor's current profile. It SHALL NOT present an electronic signature for the assisting instructor.

#### Scenario: Render the signed line
- **WHEN** a Fire roster is generated from a signed revision
- **THEN** the lead instructor's signature area shows a typed-name line naming the signer

#### Scenario: Leave the assisting signature blank
- **WHEN** a Fire roster is generated
- **THEN** the assisting instructor's signature area is left blank for physical signing

#### Scenario: Use revision facts
- **WHEN** the signer's name changes after finalization
- **THEN** the existing revision's roster still shows the name captured at finalization

### Requirement: The Fire roster prints attendee initials

The system SHALL derive each attendee's initials from the attendee's name as the first letter of the first name followed by the first letter of the last name, uppercased with no separators, and SHALL print them in the Fire roster's attendee initials column. When a name part is unavailable, the system SHALL derive initials from the available part.

#### Scenario: Derive initials from a name
- **WHEN** the Fire roster is generated for an attendee named Ada Lovelace
- **THEN** the attendee's initials cell shows "AL"

#### Scenario: Derive guest initials
- **WHEN** the Fire roster is generated for a guest attendee
- **THEN** the attendee's initials are derived from the guest name

#### Scenario: Handle a missing name part
- **WHEN** an attendee has only one name part
- **THEN** the initials use that part without a placeholder

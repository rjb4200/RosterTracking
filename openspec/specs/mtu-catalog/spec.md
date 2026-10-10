# mtu-catalog Specification

## Purpose

Maintain the department's Mobile Training Unit catalog of durable equipment and
consumable supplies, so staff record class usage against a shared, retireable
vocabulary and the system can estimate a class's supply consumption from its
size.

## Requirements

### Requirement: The MTU catalog holds equipment and supplies

The system SHALL maintain a department Mobile Training Unit catalog whose
entries are one of two kinds: equipment, which is durable and reused, and
supplies, which are consumable. Each entry SHALL have a name and SHALL be unique
within its kind.

#### Scenario: List equipment and supplies
- **WHEN** staff open the MTU catalog management screen
- **THEN** the system lists the equipment entries and the supplies entries

#### Scenario: Reject a duplicate name in a kind
- **WHEN** staff create an equipment entry whose name duplicates an existing equipment entry
- **THEN** the system rejects the duplicate and keeps the single entry

#### Scenario: Allow the same name across kinds
- **WHEN** an equipment entry and a supplies entry share a name
- **THEN** the system treats them as two distinct entries

### Requirement: Supplies carry an expected-consumption rule

Each supply entry SHALL carry an expected-consumption rule consisting of a
per-class base quantity, a per-student quantity, a rounding mode of either
round-up or exact, and a unit label. Equipment entries SHALL NOT carry a
quantity rule. The system SHALL estimate a supply's quantity for a class as its
per-class base plus its per-student quantity multiplied by the number of active
participants, then applying the rounding mode.

#### Scenario: Estimate a per-student supply
- **WHEN** a supply has a per-student quantity of two, no per-class base, and a round-up mode, and the class has ten active participants
- **THEN** the estimated quantity is twenty

#### Scenario: Estimate a per-class supply
- **WHEN** a supply has a per-class base of one, no per-student quantity, and a round-up mode
- **THEN** the estimated quantity is one regardless of the number of participants

#### Scenario: Estimate a mixture and round up
- **WHEN** a supply has a per-class base of one and a per-student quantity of one half with a round-up mode, and the class has three active participants
- **THEN** the estimated quantity is three

#### Scenario: Keep a fractional unit exact
- **WHEN** a supply measured in gallons has an exact rounding mode and a per-student quantity of one quarter, and the class has ten participants
- **THEN** the estimated quantity is two and one half gallons

#### Scenario: Equipment has no quantity rule
- **WHEN** staff create an equipment entry
- **THEN** the system does not present or store a quantity rule for it

### Requirement: The MTU catalog is managed on permission-controlled screens

The system SHALL present the MTU catalog as a searchable list, a dedicated
new-entry page, and a dedicated entry page, following the same management-screen
pattern as the other reference catalogs. Managing the MTU catalog SHALL require
the `mtu-catalog.manage` permission, which administrators and Training Majors
hold.

#### Scenario: Open the catalog management screen
- **WHEN** staff with the management permission open the MTU catalog management screen
- **THEN** the system shows a searchable list of entries

#### Scenario: Create an entry
- **WHEN** staff submit a new entry from the new-entry page
- **THEN** the system creates the entry and returns them to the catalog list

#### Scenario: Edit an entry
- **WHEN** staff change an entry's details on its entry page
- **THEN** the system stores the change and the entry page reflects it

#### Scenario: Deny access without the permission
- **WHEN** a staff member without `mtu-catalog.manage` requests the MTU catalog management screen
- **THEN** the system denies access

### Requirement: The MTU catalog has a retire-not-delete lifecycle

The system SHALL represent each MTU catalog entry as active, inactive, or
archived. Only active entries SHALL be offered for selection on a class.
Inactive and archived entries SHALL remain recorded so that classes and
finalized revisions that referenced them keep their facts unchanged. The system
SHALL NOT delete an entry that has been referenced.

#### Scenario: Offer only active entries
- **WHEN** an operator selects MTU equipment or supplies for a class
- **THEN** only active entries are offered

#### Scenario: Retire an entry without losing history
- **WHEN** staff deactivate or archive an entry
- **THEN** the entry is no longer offered while classes and revisions that referenced it keep their recorded usage

### Requirement: The initial MTU catalog is seeded from a code-owned list

The system SHALL populate the initial equipment and supplies entries from a
code-owned seed list, and SHALL NOT overwrite later staff edits to existing
entries when seeding runs again. After the initial population the catalog SHALL
be admin-managed. The system SHALL NOT backfill existing free-text MTU usage
into catalog selections.

#### Scenario: Seed the initial entries
- **WHEN** the catalog is empty and the seed runs
- **THEN** the initial equipment and supplies entries are present in the catalog

#### Scenario: Preserve later edits
- **WHEN** staff edit a seeded entry and the seed runs again
- **THEN** the staff edit is not overwritten

#### Scenario: Repopulate a cleared catalog
- **WHEN** the catalog has been cleared and the seed runs again
- **THEN** the initial entries are present again without duplicating existing ones

#### Scenario: Leave existing free text alone
- **WHEN** the seed runs
- **THEN** existing free-text MTU usage values are unchanged and are not converted into catalog selections

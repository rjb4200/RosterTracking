## ADDED Requirements

### Requirement: Reporting-system changes reconcile attendance context
When authorized staff change the reporting systems of an open class, the system SHALL reconcile every active attendance's reporting context so that it matches the class's selected reporting systems, and SHALL keep the roster ready to finalize. Adding a reporting system SHALL NOT leave an active attendance without that system's reporting context, and removing one SHALL leave no active attendance holding a context for it. Reconciliation SHALL derive inclusion only from facts the attendance already captured and SHALL NOT store any credential or student-field value the attendee did not supply. This SHALL apply whether the change is made on an open class directly or after a finalized class is reopened and edited.

#### Scenario: Add a destination to a class with signed-in attendees
- **WHEN** staff add a reporting system to an open class that already has active attendance
- **THEN** every active attendance gains the reporting context for that system and the roster remains ready to finalize

#### Scenario: Reopen, add a destination, and finalize
- **WHEN** an administrator reopens a finalized class and adds a reporting system, and the lead instructor later finalizes it again
- **THEN** finalization succeeds because every active attendance carries the added system's reporting context

#### Scenario: Remove a destination
- **WHEN** staff remove a reporting system from an open class that has active attendance
- **THEN** no active attendance retains a reporting context for the removed system

#### Scenario: Reconciliation does not invent reporting facts
- **WHEN** the system reconciles an attendance for a newly added reporting system
- **THEN** it derives inclusion only from the attendee's already-captured snapshots and stores no credential or student-field value the attendee never supplied

### Requirement: MTU requires a Fire or KBEMS destination
When authorized staff create a class or change a class's reporting systems, the system SHALL require that selecting MTU also selects Fire or KBEMS, and SHALL reject a class whose only selected reporting system is MTU. This SHALL apply to class creation and to editing an open or reopened class.

#### Scenario: Reject an MTU-only class
- **WHEN** staff create or save a class whose only selected reporting system is MTU
- **THEN** the system rejects the change and reports that MTU requires Fire or KBEMS

#### Scenario: Allow MTU alongside Fire or KBEMS
- **WHEN** staff select MTU together with Fire, KBEMS, or both
- **THEN** the system accepts the selection

#### Scenario: Reject removing the last accreditation destination from an MTU class
- **WHEN** staff remove Fire and KBEMS from a class that still selects MTU
- **THEN** the system rejects the change and reports that MTU requires Fire or KBEMS

## MODIFIED Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a class name, one of the Classroom, Hands-On, Online, or Hybrid delivery methods, a training site when applicable, selected reporting systems, an initial scheduled session, and an assigned lead instructor. The class name SHALL be the first Fire subject's class name when Fire is selected, or the EMS course name when KBEMS is selected. A class SHALL retain references to its selected catalog records for training sites and training codes rather than copied free-text values. Classroom, Hands-On, and Hybrid classes SHALL require a training site; Online classes SHALL permit no training site.

#### Scenario: Create a classroom class
- **WHEN** authorized staff enter a class name, select Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class with those selections

#### Scenario: Require a site for site-based delivery
- **WHEN** staff attempt to create or save a Classroom, Hands-On, or Hybrid class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Create an online class without a site
- **WHEN** authorized staff select Online delivery without a training site
- **THEN** the system permits the class to be created

#### Scenario: Migrate historical delivery values
- **WHEN** the delivery-method migration runs against existing classes
- **THEN** it converts `in_person` to `classroom`, `virtual` to `online`, and retains `hybrid` as `hybrid`

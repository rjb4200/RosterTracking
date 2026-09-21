# Class Management Specification

## Purpose

Allow authorized staff to create, schedule, open, complete, and cancel reusable training classes while preserving the reference data and audit trail needed by later attendance and reporting workflows.
## Requirements
### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a required course, one of the Classroom, Hands-On, Online, or Hybrid delivery methods, a training site when applicable, selected reporting systems, an initial scheduled session, and an assigned lead instructor. A class SHALL retain references to its selected catalog records rather than copied free-text values. Classroom, Hands-On, and Hybrid classes SHALL require a training site; Online classes SHALL permit no training site.

#### Scenario: Create a classroom class
- **WHEN** authorized staff select a course, Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
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

### Requirement: Classes require a host agency
The system SHALL require every class to reference one active host agency from the agency catalog. The host agency SHALL be selectable during class creation and editing, SHALL be required before a class can be opened for every delivery method including Online, and SHALL be retained with the class for reporting.

#### Scenario: Create a class with a host agency
- **WHEN** authorized staff create a class and select an active host agency
- **THEN** the draft class stores that host agency

#### Scenario: Block opening without a host agency
- **WHEN** staff attempt to open a class with no host agency
- **THEN** the system keeps the class in draft and reports the missing host agency

#### Scenario: Online classes also require a host agency
- **WHEN** staff create an Online class
- **THEN** the system still requires a host agency

### Requirement: Class components retain scheduled sessions
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time selected in 15-minute increments, a scheduled end time derived from the selected start time and credited hours, and its credited hours. A newly added component SHALL default to two credited hours. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class course name when no title is provided for official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add separate morning and afternoon components to a draft class
- **THEN** both components are retained in their scheduled order

#### Scenario: Default a new session duration
- **WHEN** staff add a new class component
- **THEN** the component starts with two credited hours and its end time is calculated from its selected start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff select a component start time and change its credited hours
- **THEN** the system recalculates and stores the end time as the start time plus the credited-hour duration

#### Scenario: Restrict session start times
- **WHEN** staff select a component start time
- **THEN** the system permits only times at :00, :15, :30, or :45 past the hour

#### Scenario: Use a session title in official output
- **WHEN** staff provide a session title and finalize a class
- **THEN** official roster output uses that title for the session-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a session title blank and finalize a class
- **THEN** official roster output uses the class course name for the session-specific field

#### Scenario: Reject invalid component time range
- **WHEN** staff enter a component whose end time is not after its start time
- **THEN** the system rejects the component

### Requirement: Classes have assigned instructors
The system SHALL let authorized staff assign active staff users as instructors and identify at most one lead instructor for each class.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment

### Requirement: Class lifecycle is controlled
The system SHALL represent open, completed, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, close public sign-in and enter completed roster review when an open class finishes attendance, finalize a completed class only once its roster is ready, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. A class SHALL be created in the open state and SHALL remain editable while it is open or completed, except where a lifecycle restriction expressly applies.

#### Scenario: Complete an open class
- **WHEN** authorized staff finish attendance for an open class
- **THEN** public sign-in closes and the class state changes to completed for roster review, whether or not the roster still needs correction

#### Scenario: Block finalization with roster errors
- **WHEN** authorized staff attempt to finalize a completed class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class completed and reports the roster validation errors

#### Scenario: Edit an open class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Edit a completed class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of a completed class that is under roster review
- **THEN** the system saves the change and the class remains completed

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel an open or completed class with a reason
- **THEN** the class state changes to cancelled and the reason is retained

### Requirement: Class changes are audited
The system SHALL record audit events for class creation, component and instructor changes, reporting-system changes, and lifecycle transitions without recording sign-in token material.

#### Scenario: Record an opening transition
- **WHEN** a staff member opens a class
- **THEN** an audit event records the actor, class, prior state, new state, and server timestamp

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a visibly stepped class-creation workflow that validates each stage before advancing, preserves entered values while navigating, and creates an open class only at final submission.

#### Scenario: Review before creation
- **WHEN** staff finish the reporting step
- **THEN** the workflow presents a review of their selections before creating the class

#### Scenario: Create and open in one submission
- **WHEN** staff submit the reviewed workflow
- **THEN** the system creates the class already open and ready to accept student sign-in

### Requirement: Class sessions share a roster day
The system SHALL require every scheduled component of a class to occur on the same department-calendar day so one class has one roster for one day while retaining multiple subject sessions.

#### Scenario: Add subjects on one day
- **WHEN** staff add multiple subject sessions on the same department-calendar day
- **THEN** the class retains the sessions under one class roster

#### Scenario: Reject a session on another day
- **WHEN** staff add or update a session whose department-calendar date differs from the class's existing sessions
- **THEN** the system rejects the session with a single-day roster validation error

### Requirement: Staff configure optional student access PINs
The class creation and editing workflow SHALL let authorized staff enable or disable a student access PIN before a class is opened. PIN protection SHALL default to disabled. When enabled, the system SHALL generate a four-digit numeric PIN; staff SHALL NOT choose the value manually.

#### Scenario: Create a class without a PIN
- **WHEN** authorized staff create a class without enabling PIN protection
- **THEN** the class opens without requiring students to enter a PIN

#### Scenario: Enable PIN protection before opening
- **WHEN** authorized staff enable PIN protection for a draft class
- **THEN** the system generates a four-digit numeric PIN and requires it for public student access after the class opens

### Requirement: Authorized instructors can view enabled class PINs
The system SHALL display the current four-digit student access PIN only to authorized instructors for the associated open class. The system SHALL stop displaying the PIN when the class leaves the open state.

#### Scenario: View an enabled PIN during an open class
- **WHEN** an authorized instructor views an open class with PIN protection enabled
- **THEN** the instructor can view the current four-digit numeric PIN

#### Scenario: Hide PIN after class closure
- **WHEN** a class leaves the open state
- **THEN** the student access PIN is not displayed to staff or public visitors

### Requirement: Class list defaults to current operational work
The system SHALL present the staff class list scoped by default to current operational work: classes whose scheduled sessions fall on or after the default lookback of 30 days, whose lifecycle state is draft, open, or completed, and classes finalized within the last seven days. The system SHALL exclude cancelled classes and finalized classes older than that grace window unless the operator includes them. The system SHALL let authorized staff widen the list through a session date range, a lifecycle status selection, and explicit inclusion of finalized and cancelled classes, while keeping the existing course and site search.

#### Scenario: Show current work by default
- **WHEN** an authorized staff member opens the class list without changing any filter
- **THEN** the system lists draft, open, and completed classes whose sessions fall within the default recent window together with classes finalized within the last seven days, and excludes cancelled classes

#### Scenario: Hide a stale draft
- **WHEN** a draft class was created more than seven days ago
- **THEN** the system omits that draft from the default list

#### Scenario: Reach a hidden class through the filters
- **WHEN** an operator widens the status or session date filters, or chooses to include finalized and cancelled classes
- **THEN** the system lists the previously hidden classes that match the widened filters

#### Scenario: Retain unfinalized work with students
- **WHEN** a class has at least one active student on its roster, has not been finalized, and its session falls outside the default recent window
- **THEN** the system still lists that class until it is finalized

#### Scenario: Filter by session date range
- **WHEN** an operator sets a session date range
- **THEN** the system lists only classes whose sessions fall within that range, apart from unfinalized classes that have active students

#### Scenario: Search within the active filters
- **WHEN** an operator searches by course or site name
- **THEN** the system limits results to classes matching the search within the active filters

### Requirement: Class list status is scannable
The system SHALL distinguish every lifecycle state on the class list with a colored indicator and the written state name, SHALL keep each state understandable without relying on color alone, and SHALL show an overdue roster as a separate indicator beside the class status rather than replacing it.

#### Scenario: Distinguish lifecycle states
- **WHEN** the class list shows draft, open, completed, finalized, and cancelled classes
- **THEN** each state is visually distinguishable from the others

#### Scenario: Keep status readable without color
- **WHEN** a class status is displayed with a colored indicator
- **THEN** the written lifecycle state remains present

#### Scenario: Flag an overdue roster beside the status
- **WHEN** a class has an overdue roster
- **THEN** the system shows an overdue indicator alongside, not instead of, the lifecycle status


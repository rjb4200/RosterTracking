# Class Management Specification

## Purpose

Allow authorized staff to create, schedule, open, finalize, and cancel reusable training classes while preserving the reference data and audit trail needed by later attendance and reporting workflows.
## Requirements
### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a class name, one of the Classroom, Hands-On, Online, or Hybrid delivery methods, a training site when applicable, selected reporting systems, an initial scheduled session, and an assigned lead instructor. The class name SHALL be the first Fire subject's class name when Fire is selected, the EMS course name when KBEMS is selected, or a class name entered on the class-and-schedule step when neither is selected. A class SHALL retain references to its selected catalog records for training sites and training codes rather than copied free-text values. Classroom, Hands-On, and Hybrid classes SHALL require a training site; Online classes SHALL permit no training site.

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
The system SHALL let authorized staff add one or more components to a draft class. Each component SHALL store an optional session title, a scheduled start time normalized to a 15-minute increment, a scheduled end time derived from the selected start time and credited hours, and its credited hours. Each session start time SHALL be entered on a 15-minute cadence and SHALL default to the nearest quarter hour. A session start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, which may roll to the next hour or the next day. A newly added component SHALL default to two credited hours. The session title SHALL identify the session in staff scheduling and SHALL fall back to the class name when no title is provided for official roster output.

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

#### Scenario: Round a typed session start time
- **WHEN** staff enter a component start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time is rounded to the nearest 15-minute value, 09:00, and that rounded time is what the field shows and what is stored

#### Scenario: Roll a rounded session start time forward
- **WHEN** rounding pushes a session start past the end of the day
- **THEN** the rounded start is the next day at the earliest time on the cadence

#### Scenario: Use a session title in official output
- **WHEN** staff provide a session title and finalize a class
- **THEN** official roster output uses that title for the session-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a session title blank and finalize a class
- **THEN** official roster output uses the class name for the session-specific field

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
The system SHALL represent open, finalized, and cancelled class states. It SHALL present authorized operators lifecycle actions in plain operational language, finalize an open class only once its roster is ready and only by its lead instructor, reopen a finalized class only with an authorized reason, and cancel a non-finalized class. A class SHALL be created in the open state and SHALL remain editable while it is open, except where a lifecycle restriction expressly applies.

#### Scenario: Finalize an open class
- **WHEN** the class's lead instructor finalizes a roster-ready open class
- **THEN** public sign-in closes, the class state changes to finalized, and the roster is locked in the same action

#### Scenario: Block finalization with roster errors
- **WHEN** the lead instructor attempts to finalize an open class whose roster has no active attendance, missing required reporting context, or credited hours outside the class scheduled total
- **THEN** the system keeps the class open, leaves public sign-in unchanged, and reports the roster validation errors

#### Scenario: Edit an open class
- **WHEN** authorized staff change the course, site, host agency, reporting systems, sessions, or lead instructor of an open class
- **THEN** the system saves the change and the class remains open

#### Scenario: Lock finalized class editing
- **WHEN** a class is finalized
- **THEN** normal class and roster edits are rejected until an authorized reopen occurs

#### Scenario: Reopen a finalized class
- **WHEN** authorized staff provide a non-empty reopen reason
- **THEN** the class leaves finalized state, returns to open, and retains the reason and prior finalization history

#### Scenario: Cancel a class
- **WHEN** authorized staff cancel an open class with a reason
- **THEN** the class state changes to cancelled and the reason is retained

### Requirement: Class changes are audited
The system SHALL record audit events for class creation, component and instructor changes, reporting-system changes, and lifecycle transitions without recording sign-in token material.

#### Scenario: Record an opening transition
- **WHEN** a staff member opens a class
- **THEN** an audit event records the actor, class, prior state, new state, and server timestamp

### Requirement: Class creation is a stepped staff workflow
The system SHALL provide authorized staff a visibly stepped class-creation workflow that validates each stage before advancing, preserves entered values while navigating, and creates an open class only at final submission. The workflow's class start time SHALL default to the nearest quarter hour and SHALL be entered on a 15-minute cadence. A class start time that is not a whole 15-minute increment SHALL be rounded to the nearest one, visibly in the field and in the value the system stores, and the rounding may roll to the next hour or the next day.

#### Scenario: Review before creation
- **WHEN** staff finish the reporting step
- **THEN** the workflow presents a review of their selections before creating the class

#### Scenario: Create and open in one submission
- **WHEN** staff submit the reviewed workflow
- **THEN** the system creates the class already open and ready to accept student sign-in

#### Scenario: Default the class start time to the nearest quarter hour
- **WHEN** staff open the class-creation workflow and reach the class start time field
- **THEN** the field presents the nearest upcoming quarter hour as its starting value

#### Scenario: Round a typed class start time
- **WHEN** staff enter a class start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time rounds to the nearest 15-minute value, 09:00, and that rounded value is what the field shows and what is stored

#### Scenario: Keep a typed class start time on the cadence
- **WHEN** staff submit a class whose start time is not a whole 15-minute increment
- **THEN** the stored class start time is the nearest 15-minute value, regardless of how the value was supplied

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
The system SHALL present the staff class list scoped by default to current operational work: classes whose scheduled sessions fall on or after the default lookback of 30 days, whose lifecycle state is open, and classes finalized within the last seven days. The system SHALL exclude cancelled classes and finalized classes older than that grace window unless the operator includes them. The system SHALL let authorized staff widen the list through a session date range, a lifecycle status selection, and explicit inclusion of finalized and cancelled classes, while keeping the existing class and site search.

#### Scenario: Show current work by default
- **WHEN** an authorized staff member opens the class list without changing any filter
- **THEN** the system lists open classes whose sessions fall within the default recent window together with classes finalized within the last seven days, and excludes cancelled classes

#### Scenario: Hide a stale class
- **WHEN** a class was created more than seven days ago and is neither open with a recent session nor recently finalized
- **THEN** the system omits that class from the default list

#### Scenario: Reach a hidden class through the filters
- **WHEN** an operator widens the status or session date filters, or chooses to include finalized and cancelled classes
- **THEN** the system lists the previously hidden classes that match the widened filters

#### Scenario: Retain unfinalized work with students
- **WHEN** an open class has at least one active student on its roster and its session falls outside the default recent window
- **THEN** the system still lists that class until it is finalized

#### Scenario: Filter by session date range
- **WHEN** an operator sets a session date range
- **THEN** the system lists only classes whose sessions fall within that range, apart from open classes that have active students

#### Scenario: Search within the active filters
- **WHEN** an operator searches by course or site name
- **THEN** the system limits results to classes matching the search within the active filters

### Requirement: Class list status is scannable
The system SHALL distinguish every lifecycle state on the class list with a colored indicator and the written state name, SHALL keep each state understandable without relying on color alone, and SHALL show an overdue roster as a separate indicator beside the class status rather than replacing it.

#### Scenario: Distinguish lifecycle states
- **WHEN** the class list shows open, finalized, and cancelled classes
- **THEN** each state is visually distinguishable from the others

#### Scenario: Keep status readable without color
- **WHEN** a class status is displayed with a colored indicator
- **THEN** the written lifecycle state remains present

#### Scenario: Flag an overdue roster beside the status
- **WHEN** a class has an overdue roster
- **THEN** the system shows an overdue indicator alongside, not instead of, the lifecycle status

### Requirement: Class sessions retain Fire subject fields
The system SHALL let a class session store a Fire subject: a training-code reference (category), a class name, a curriculum reference, and a free-text lesson plan. A class SHALL support up to two Fire subjects for official Fire output. These fields SHALL be editable while the class is open and SHALL be preserved at finalization.

#### Scenario: Save a Fire subject
- **WHEN** staff save a class session with a category, class name, curriculum, and lesson plan
- **THEN** the system stores those values on the session

#### Scenario: Backfill a migrated session
- **WHEN** the migration runs against an existing session
- **THEN** its class name is set from the class course name and its category from the course's training code where available, with curriculum and lesson plan left empty

#### Scenario: Preserve Fire subjects at finalization
- **WHEN** a class with Fire subjects is finalized
- **THEN** the revision retains each subject's category, class name, curriculum, and lesson plan

### Requirement: A session's KFS-1A method follows the class delivery method
The system SHALL derive every session's KFS-1A Method from the class delivery method: Classroom marks CR, Hands-On marks HO, Online marks OL, and Hybrid marks both CR and OL. When staff change the delivery method of an open class, the system SHALL update every session's Method to match the new delivery method.

#### Scenario: Derive the method at class creation
- **WHEN** staff create a class with a delivery method and one or more Fire subjects
- **THEN** each created session stores the delivery method's KFS-1A method

#### Scenario: Hybrid marks both boxes
- **WHEN** a session's class uses Hybrid delivery
- **THEN** the session's KFS-1A method marks both CR and OL

#### Scenario: Re-derive the method when the delivery method changes
- **WHEN** staff change the delivery method of an open class
- **THEN** every session's KFS-1A method is updated to match the new delivery method

### Requirement: Instructor certification details accompany the roster
The system SHALL retain each assigned instructor's Fire Commission FFN and certification level as finalization facts so official Fire output can print them, without altering the instructor's current profile.

#### Scenario: Capture instructor certification facts
- **WHEN** a class is finalized
- **THEN** the revision retains each assigned instructor's name, FFN, and certification level as they were at finalization

#### Scenario: Later profile change does not rewrite history
- **WHEN** an instructor's FFN or level changes after finalization
- **THEN** the existing revision keeps the values captured at finalization

### Requirement: Class retains EMS course type and number
The system SHALL let a class store an EMS course type and a course number. These SHALL be editable while the class is open, SHALL be preserved at finalization, and SHALL be available to completion-certificate output.

#### Scenario: Save EMS course details
- **WHEN** staff save a class with a course type and course number
- **THEN** the system stores those values on the class

#### Scenario: Preserve EMS course details at finalization
- **WHEN** a class with a course type and course number is finalized
- **THEN** the revision retains both values for certificate generation

#### Scenario: Later class edit does not rewrite history
- **WHEN** the class course type or number changes after finalization
- **THEN** the existing revision keeps the values captured at finalization

### Requirement: Class sessions retain a Fire subject chapter and typed book

The system SHALL let a class session store a Fire subject chapter and, when the book is not in the approved catalog, a free-text curriculum name alongside the training-code reference, class name, curriculum reference, and lesson plan. These values SHALL be editable while the class is open and SHALL be preserved at finalization.

#### Scenario: Save a subject chapter
- **WHEN** staff save a class session with a chapter
- **THEN** the system stores the chapter on the session

#### Scenario: Save a typed book
- **WHEN** staff save a class session with a free-text curriculum name
- **THEN** the system stores that name on the session

#### Scenario: Preserve the chapter and typed book at finalization
- **WHEN** a class with a subject chapter or a typed book is finalized
- **THEN** the revision retains the chapter and the typed book name

### Requirement: Fire reporting and instructor changes require valid FFNs
When authorized staff add the Fire reporting system to a class, or change its assigned lead or assisting instructors while Fire is selected, the system SHALL require every assigned instructor to have a valid FFN (`0000-0000`) and SHALL reject the change otherwise. This SHALL prevent bypassing the Fire class guard through an edit.

#### Scenario: Reject adding Fire with an instructor lacking a valid FFN
- **WHEN** staff add the Fire reporting system to a class whose lead or assisting instructor has no valid FFN
- **THEN** the system rejects the change and identifies the instructor

#### Scenario: Reject assigning an instructor without a valid FFN to a Fire class
- **WHEN** staff assign an instructor without a valid FFN to a class that has Fire selected
- **THEN** the system rejects the change and identifies the instructor

#### Scenario: Allow the change when every instructor has a valid FFN
- **WHEN** every assigned instructor has a valid FFN
- **THEN** the system saves the Fire reporting or instructor change

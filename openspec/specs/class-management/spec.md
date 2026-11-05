# Class Management Specification

## Purpose

Allow authorized staff to create, schedule, open, finalize, and cancel reusable training classes while preserving the reference data and audit trail needed by later attendance and reporting workflows.

## Requirements

### Requirement: Class records use reference data
The system SHALL let authorized staff create an open class with a class name, a non-empty set of delivery methods drawn from Classroom, Hands-On, and Online, a required training site, selected reporting systems, an initial scheduled session, and an assigned lead instructor. The class name SHALL be the first Fire subject's class name when Fire is selected, or the EMS course name when KBEMS is selected. A class SHALL retain references to its selected catalog records for training sites and training codes rather than copied free-text values. Every class SHALL reference one active training site regardless of its delivery methods, and the delivery methods SHALL NOT affect whether a training site is required.

#### Scenario: Create a classroom class
- **WHEN** authorized staff enter a class name, select Classroom delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class with those selections

#### Scenario: Create a class with multiple delivery methods
- **WHEN** authorized staff enter a class name, select Classroom and Hands-On delivery, a training site, a scheduled session, a lead instructor, and reporting systems
- **THEN** the system creates an open class carrying both delivery methods

#### Scenario: Require a site for site-based delivery
- **WHEN** staff attempt to create or save a Classroom, Hands-On, or Online class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Create an online class without a site
- **WHEN** authorized staff attempt to create an Online class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Require a site for every class
- **WHEN** staff attempt to create or save a class without a training site
- **THEN** the system rejects the change with a site-required validation error

#### Scenario: Use a site for an online class
- **WHEN** authorized staff select Online delivery and choose a site named Online
- **THEN** the system creates the class with that site

#### Scenario: Reject an empty delivery set
- **WHEN** staff attempt to create or save a class with no delivery method selected
- **THEN** the system rejects the change and asks for at least one delivery method

#### Scenario: Migrate historical delivery values
- **WHEN** the delivery-method migration runs against existing classes
- **THEN** it converts `in_person` to `classroom`, `virtual` to `online`, and `hybrid` to `classroom,online`

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
The system SHALL let authorized staff add one or more ordered subject components to a class. A class SHALL have one start time normalized to a 15-minute increment. Each subject SHALL store an optional title, a credited duration selected from 15-minute values from 30 minutes through 16 hours, and its position. The first subject SHALL start at the class start; each later subject SHALL start at the previous subject's end without a gap. The system SHALL derive each subject's end time from its start and duration. The class scheduled total SHALL be the sum of subject durations. A new subject SHALL default to two credited hours. A stored duration outside the offered range SHALL remain selectable so an edit does not change it unless staff choose another. The subject title SHALL identify the subject and SHALL fall back to the class name in official roster output.

#### Scenario: Add multiple sessions
- **WHEN** staff add a second subject component to a class
- **THEN** both subjects are retained in scheduled order with the second start derived from the first subject's end

#### Scenario: Default a new session duration
- **WHEN** staff add a new subject component
- **THEN** the subject starts with two credited hours and its end time is derived from its start time plus those hours

#### Scenario: Calculate the end time from credited hours
- **WHEN** staff change a subject's credited hours
- **THEN** the system recalculates that subject's end time and every later subject's start and end

#### Scenario: Choose credited hours from the combined selection
- **WHEN** staff select 2h 15m from a subject's duration selection
- **THEN** the subject stores 2.25 credited hours and its end time is derived from its start time plus two hours and fifteen minutes

#### Scenario: Enter credited hours in quarter-hour steps
- **WHEN** staff set a subject's credited hours to two hours and fifteen minutes
- **THEN** the system stores 2.25 credited hours and derives the end time from its start time plus two hours and fifteen minutes

#### Scenario: Keep an out-of-range current duration
- **WHEN** staff edit a subject whose stored credited hours are 15m
- **THEN** the duration selection includes 15m as the current value and saving without changing it preserves those credited hours

#### Scenario: Reject a duration outside the quarter-hour cadence
- **WHEN** a subject is submitted with a credited duration that is not a whole 15-minute increment
- **THEN** the system rejects the subject

#### Scenario: Restrict session start times
- **WHEN** staff select the class start time
- **THEN** the system permits only times at :00, :15, :30, or :45 past the hour

#### Scenario: Round a typed session start time
- **WHEN** staff enter a class start time that is not a whole 15-minute increment, such as 09:07
- **THEN** the entered time is rounded to the nearest 15-minute value, 09:00, and that rounded time is what the field shows and what is stored

#### Scenario: Roll a rounded session start time forward
- **WHEN** rounding pushes the class start past the end of the day
- **THEN** the rounded start is the next day at the earliest time on the cadence

#### Scenario: Use a session title in official output
- **WHEN** staff provide a subject title and finalize a class
- **THEN** official roster output uses that title for the subject-specific field

#### Scenario: Fall back when a session title is omitted
- **WHEN** staff leave a subject title blank and finalize a class
- **THEN** official roster output uses the class name for the subject-specific field

#### Scenario: Reject invalid component time range
- **WHEN** a subject is submitted without a positive credited duration
- **THEN** the system rejects the subject

#### Scenario: Derive sequential times
- **WHEN** a class starts at 11:00 with a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the first subject runs from 11:00 to 12:30 and the second runs from 12:30 to 13:00

#### Scenario: Sum the class total
- **WHEN** a class has a 1.5-hour first subject and a 0.5-hour second subject
- **THEN** the class scheduled total is 2.0 hours

#### Scenario: No gap between subjects
- **WHEN** staff save sequential subject durations
- **THEN** each later subject starts at the previous subject's end and no gap is stored

### Requirement: Classes have assigned instructors

The system SHALL let authorized staff assign active staff users as instructors and identify exactly one lead instructor and at most one assistant instructor for each class. Assigning a lead SHALL replace the previous lead. Assigning an assistant SHALL replace any previous assistant. The system SHALL refuse to leave the class without a lead.

#### Scenario: Assign a lead instructor
- **WHEN** staff assign an active instructor as the lead instructor for a class
- **THEN** the instructor assignment is stored as the class lead

#### Scenario: Replace the lead instructor
- **WHEN** staff select a different instructor as the lead for the same class
- **THEN** the newly selected instructor becomes the only lead assignment and the previous lead is no longer assigned

#### Scenario: Assign an assistant instructor
- **WHEN** staff assign an active instructor other than the lead as the assistant instructor for a class
- **THEN** the instructor assignment is stored as the class assistant instructor

#### Scenario: Refuse to leave the class without a lead
- **WHEN** staff attempt to clear the lead without selecting a replacement
- **THEN** the system refuses and keeps the lead assignment

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

The system SHALL require every scheduled component of a class to occur on the same department-calendar day so one class has one roster for one day while retaining multiple subject sessions. An initial-certification program class SHALL be exempt and MAY use one program block that spans multiple department-calendar days.

#### Scenario: Add subjects on one day

- **WHEN** staff add multiple subject sessions on the same department-calendar day
- **THEN** the class retains the sessions under one class roster

#### Scenario: Reject a session on another day

- **WHEN** staff add or update a session whose department-calendar date differs from the class's existing sessions
- **THEN** the system rejects the session with a single-day roster validation error

#### Scenario: Allow an initial-certification program block to span days

- **WHEN** staff create an initial-certification program class whose program block ends on a later department-calendar day
- **THEN** the system accepts the program block

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

The system SHALL distinguish every lifecycle state on the class list with a colored indicator and the written state name, SHALL keep each state understandable without relying on color alone, and SHALL show an overdue roster as a separate indicator beside the class status rather than replacing it. It SHALL also show a pending required attestation as a separate indicator beside the class status, naming the pending document scope without replacing the lifecycle state.

#### Scenario: Distinguish lifecycle states
- **WHEN** the class list shows open, finalized, and cancelled classes
- **THEN** each state is visually distinguishable from the others

#### Scenario: Keep status readable without color
- **WHEN** a class status is displayed with a colored indicator
- **THEN** the written lifecycle state remains present

#### Scenario: Flag an overdue roster beside the status
- **WHEN** a class has an overdue roster
- **THEN** the system shows an overdue indicator alongside, not instead of, the lifecycle status

#### Scenario: Flag a pending signature beside the status
- **WHEN** a finalized class has a pending required attestation
- **THEN** the system shows a pending-signature indicator naming the document scope alongside, not instead of, the lifecycle status

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

### Requirement: Class list empty states guide the operator

The system SHALL explain an empty class list and offer the create-class action when no class exists at all, offer to clear the filters or search when those exclude every class, and confirm that no finalized classes are available without offering an action when the finalized section is empty.

#### Scenario: No classes exist
- **WHEN** the class list is empty because no classes exist
- **THEN** the list explains that no classes exist yet and offers the create-class action

#### Scenario: Filters exclude every class
- **WHEN** the class list is empty because the active filters or search exclude every class
- **THEN** the list offers to clear the filters or search

#### Scenario: No finalized classes
- **WHEN** the finalized classes section is empty
- **THEN** the section confirms that no finalized classes are available and offers no action

### Requirement: A class has exactly one lead and at most one assistant

The system SHALL keep exactly one lead instructor and zero or one assistant instructor for each class while it is open. Authorized staff SHALL be able to replace the lead and to set, change, or clear the assistant. Replacing the lead SHALL remove the previous lead assignment rather than demoting it into the assistant slot. Setting or changing the assistant SHALL NOT change the lead. An instructor SHALL NOT hold both roles.

#### Scenario: Replace the lead instructor
- **WHEN** authorized staff choose a different instructor as the lead for an open class
- **THEN** the newly chosen instructor is the only lead and the previous lead is no longer assigned

#### Scenario: Add an assistant instructor
- **WHEN** authorized staff choose an active staff member who is not the lead as the assistant for an open class
- **THEN** the class records that instructor as its assistant and keeps the lead unchanged

#### Scenario: Change the assistant instructor
- **WHEN** authorized staff choose a different instructor as the assistant
- **THEN** the class records the newly chosen instructor as its only assistant

#### Scenario: Clear the assistant instructor
- **WHEN** authorized staff clear the assistant for an open class
- **THEN** the class is left with its lead and no assistant

#### Scenario: Replace the assistant with the lead
- **WHEN** authorized staff choose the current assistant as the new lead
- **THEN** the assistant becomes the only lead and the class has no assistant, because the previous lead is removed

#### Scenario: Reject the lead as the assistant
- **WHEN** authorized staff choose the current lead as the assistant
- **THEN** the system rejects the change and keeps the roles distinct

### Requirement: Fire reporting and instructor changes require a fire instructor

When authorized staff add the Fire reporting system to a class, or change its assigned lead or assistant while Fire is selected, the system SHALL ensure the resulting assignment set contains at least one fire instructor — a staff member with both a valid FFN (`0000-0000`) and a Fire Instructor certification level (1, 2, or 3) — and SHALL reject the change otherwise. Validation SHALL apply to the assignment set that will exist after the write, not the current set plus the newly selected instructor. This SHALL prevent bypassing the Fire guard through an edit and SHALL prevent a temporary invalid state during a combined change.

#### Scenario: Reject adding Fire with no fire instructor
- **WHEN** staff add the Fire reporting system to a class whose assigned instructors include no fire instructor
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Reject removing the only fire instructor
- **WHEN** staff change or clear the assigned instructor who is the class's only fire instructor while Fire is selected
- **THEN** the system rejects the change and identifies that a fire instructor is required

#### Scenario: Allow a change that keeps a fire instructor
- **WHEN** staff change the lead or assistant such that at least one assigned instructor remains a fire instructor
- **THEN** the system saves the change

#### Scenario: Validate the resulting set
- **WHEN** staff replace a fire-eligible lead with a non-fire lead while the assistant is not fire-eligible
- **THEN** the system rejects the change even though the outgoing lead is still assigned at validation time

### Requirement: A session's KFS-1A method defaults from the class delivery method
The system SHALL store one method set for the class, derived from the class delivery methods: Classroom marks CR, Hands-On marks HO, and Online marks OL. The class delivery methods SHALL form a non-empty set. Every subject SHALL use the class method set for official output. Staff SHALL NOT set an independent method for an individual subject. When staff change the delivery methods of an open class, every subject's method SHALL update to the new set.

#### Scenario: Derive the method at class creation
- **WHEN** staff create a class with Classroom and Hands-On delivery and one or more subjects
- **THEN** every created subject stores CR and HO as its KFS-1A method

#### Scenario: Mark any method combination
- **WHEN** staff set the class method set to CR and HO
- **THEN** every subject stores both CR and HO

#### Scenario: Override one session independently
- **WHEN** staff edit a single subject
- **THEN** the system does not offer an independent method for that subject and every subject uses the class method set

#### Scenario: Preserve an overridden session when delivery changes
- **WHEN** staff change the class delivery methods
- **THEN** no subject keeps an independent method and every subject updates to the new class method set

#### Scenario: Follow the new default for inherited sessions
- **WHEN** staff change the class delivery methods
- **THEN** every subject's method is the new class method set

#### Scenario: Require at least one method
- **WHEN** staff attempt to save a class with no delivery method selected
- **THEN** the system rejects the change and asks for at least one method

#### Scenario: Read a legacy hybrid method
- **WHEN** a subject recorded the legacy `hybrid` method
- **THEN** the system presents it as CR and OL

### Requirement: Session lesson plan seeds from a catalog chapter

The system SHALL fill an empty session lesson plan with the selected catalog chapter's title and SHALL preserve manually entered text. If the value still equals the previous chapter's title, the system SHALL replace it when the chapter changes and clear it when the chapter or curriculum is cleared. A typed chapter SHALL NOT seed the lesson plan.

#### Scenario: Select a catalog chapter with an empty lesson plan

- **WHEN** staff select a catalog chapter for a session whose lesson plan is empty
- **THEN** the lesson plan is filled with that chapter's title

#### Scenario: Preserve a manually entered session lesson plan

- **WHEN** staff have typed a session lesson plan and then select a catalog chapter
- **THEN** the typed lesson plan is preserved

#### Scenario: Replace an auto-filled session lesson plan

- **WHEN** the lesson plan still equals the previous chapter's title and staff select another catalog chapter
- **THEN** the lesson plan is replaced with the new chapter's title

#### Scenario: Clear an auto-filled session lesson plan

- **WHEN** the lesson plan still equals the chapter title and staff clear the chapter or change the curriculum
- **THEN** the lesson plan is cleared

#### Scenario: Do not seed from a typed session chapter

- **WHEN** staff choose `Not listed` and type a session chapter
- **THEN** the lesson plan is not filled from the typed chapter

### Requirement: Session lesson plan field is compact

The session editor lesson plan SHALL be presented in a single-line text area.

#### Scenario: Present a compact session lesson plan field

- **WHEN** staff edit a session
- **THEN** the lesson plan is a single-line text area

### Requirement: Class-edit objectives field is compact

The class edit form SHALL present the course description or objectives in a compact two-line text area and SHALL retain the full entered value without a hard character limit or counter.

#### Scenario: Present a compact objectives field on class edit

- **WHEN** staff edit a class
- **THEN** the course description or objectives field is a two-line text area

#### Scenario: Retain the edited objectives

- **WHEN** staff change the course objectives and save the class
- **THEN** the system retains the full entered value

### Requirement: A session records a chapter with the shared catalog selection

The system SHALL let staff attach a chapter to a scheduled session. When the session's selected curriculum has catalog chapters, the session editor SHALL offer every catalog chapter in a filterable selection grouped by section, SHALL present that selection in a scrollable control usable on small screens, and SHALL also accept a typed chapter through a `Not listed` choice. The chapter SHALL be required when the chosen curriculum has catalog chapters. Changing the session's curriculum SHALL clear its chapter value. When the chosen curriculum has no catalog chapters, the chapter SHALL be optional free text.

#### Scenario: Offer session chapters
- **WHEN** staff choose a curriculum with catalog chapters for a session
- **THEN** the session editor offers every catalog chapter, grouped by section

#### Scenario: Filter session chapters
- **WHEN** staff type part of a chapter number or title in the session chapter filter
- **THEN** the selection narrows to the matching catalog chapters

#### Scenario: Accept a typed session chapter
- **WHEN** staff choose `Not listed` and type a chapter for a session
- **THEN** the system retains the typed chapter for that session

#### Scenario: Preserve a stored non-catalog chapter
- **WHEN** staff edit a session whose stored chapter is not in the selected curriculum's catalog
- **THEN** the editor shows that chapter as the typed value without changing it

#### Scenario: Clear a session chapter on curriculum change
- **WHEN** staff change a session's curriculum
- **THEN** the session's chapter value is cleared

#### Scenario: Require a session chapter
- **WHEN** staff save a session whose curriculum has catalog chapters without a chapter
- **THEN** the system rejects the save and identifies the missing chapter

### Requirement: Initial-certification program class

The system SHALL store the selected initial-certification program on the class and SHALL represent the program as one program block whose credited hours equal the program hours. The program block SHALL be the class total and the default source of participant credit. The class SHALL remain KBEMS-only.

#### Scenario: Store the program and hours

- **WHEN** staff create an EMT-B initial-certification class
- **THEN** the class stores the EMT-B program and one 160-hour program block

#### Scenario: Default participant credit from the program

- **WHEN** a participant signs in to an initial-certification program class
- **THEN** the default credited hours equal the program hours

#### Scenario: Keep program classes KBEMS-only

- **WHEN** staff select Fire on an initial-certification program class
- **THEN** the system rejects the combination

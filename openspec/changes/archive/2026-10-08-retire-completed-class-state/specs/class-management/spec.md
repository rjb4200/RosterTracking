## MODIFIED Requirements

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

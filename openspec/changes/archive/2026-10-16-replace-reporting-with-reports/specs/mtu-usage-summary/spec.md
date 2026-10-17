## ADDED Requirements

### Requirement: MTU Usage Summary report

The system SHALL generate the MTU Usage Summary as a downloadable PDF for the selected time frame, organized so it can be used to track grant purchase use, and SHALL include the period totals, transportation mileage, a location-based basic student list, a course list, supplies, and equipment use.

#### Scenario: Generate the MTU Usage Summary
- **WHEN** an authorized user selects the MTU Usage Summary and a time frame and generates it
- **THEN** the system produces a PDF covering that time frame with the summary, transportation, location/student-list, course-list, supplies, and equipment sections

#### Scenario: A time frame with no matching classes
- **WHEN** the selected time frame contains no in-scope classes
- **THEN** the system produces the report showing zero totals and empty detail sections rather than failing

### Requirement: MTU Usage Summary scope

The report SHALL include a class only when the class has the MTU reporting system selected, has at least one active attendance, is not cancelled, and its class date falls within the selected time frame. The class date SHALL be the earliest scheduled component start time. The class's state (draft, open, or finalized) SHALL NOT affect inclusion.

#### Scenario: An MTU class with sign-ins is included
- **WHEN** a class with MTU selected has at least one active attendance and its class date is within the time frame
- **THEN** the class is included in the report

#### Scenario: A class without MTU is excluded
- **WHEN** a class in the time frame does not have MTU selected
- **THEN** the class is excluded from the report

#### Scenario: An MTU class with no sign-ins is excluded
- **WHEN** a class with MTU selected has no active attendance
- **THEN** the class is excluded from the report

#### Scenario: A cancelled class is excluded
- **WHEN** a cancelled class otherwise matches the scope
- **THEN** the class is excluded from the report

#### Scenario: An open class with sign-ins is included
- **WHEN** an open or draft class with MTU selected has at least one active attendance and its class date is within the time frame
- **THEN** the class is included in the report

#### Scenario: A class outside the time frame is excluded
- **WHEN** a class's class date falls outside the selected time frame
- **THEN** the class is excluded from the report

### Requirement: MTU Usage Summary period totals

The report SHALL show the total instructor hours, total student hours, number of training sites, and number of students for the selected time frame, computed as: instructor hours as the sum over included classes of the class's credited hours multiplied by its instructor count; student hours as the sum over included classes of the class's credited hours multiplied by its student count; students as the total active attendance across included classes; and sites as the count of distinct training sites among included classes. A class's credited hours SHALL be the sum of its components' credited hours.

#### Scenario: Hours reflect class hours times people
- **WHEN** an included class has five credited hours, one instructor, and five students
- **THEN** the report counts five instructor hours and twenty-five student hours for that class

#### Scenario: A student in two classes counts twice
- **WHEN** the same student has active attendance in two included classes
- **THEN** the student count includes that student once for each class

#### Scenario: Two classes at one site count as one site
- **WHEN** two included classes are held at the same training site
- **THEN** the site count is one

### Requirement: MTU Usage Summary transportation mileage

The report SHALL show transportation mileage as separate lines: the van estimate, POV mileage, and department vehicle mileage. Each line SHALL be the total mileage recorded for that vehicle across included classes.

#### Scenario: Mileage is split by vehicle
- **WHEN** included classes recorded mileage for the van, POV, and the department vehicle
- **THEN** the report shows the van estimate, POV mileage, and department vehicle mileage as separate lines

#### Scenario: A vehicle with no recorded mileage shows zero
- **WHEN** no included class recorded mileage for a given vehicle
- **THEN** that vehicle's line shows zero

### Requirement: MTU Usage Summary location and student list

The report SHALL show, for the included classes, the training location with a basic list of the students who attended.

#### Scenario: Students are listed under their location
- **WHEN** the report is generated
- **THEN** it lists the included training locations and the basic student list for each

### Requirement: MTU Usage Summary course list

The report SHALL show the list of courses taught by the included classes.

#### Scenario: Courses are listed
- **WHEN** the report is generated
- **THEN** it lists the courses taught by the included classes

### Requirement: MTU Usage Summary supplies

The report SHALL show the supplies used, totaled across the included classes.

#### Scenario: Supplies are totaled
- **WHEN** included classes used supplies
- **THEN** the report lists the supplies with their total quantity across the period

### Requirement: MTU Usage Summary equipment use

The report SHALL show the equipment used across the included classes.

#### Scenario: Equipment is listed
- **WHEN** included classes used equipment
- **THEN** the report lists the equipment used across the period

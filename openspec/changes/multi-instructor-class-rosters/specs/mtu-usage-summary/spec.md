# Spec Delta

## MODIFIED Requirements

### Requirement: MTU Usage Summary period totals

The report SHALL show the total instructor hours, total student hours, number of training sites, and number of students for the selected time frame, computed as: instructor hours as the sum over included classes of the class's credited hours multiplied by its instructor count; student hours as the sum over included classes of the class's credited hours multiplied by its student count; students as the total active attendance across included classes; and sites as the count of distinct training sites among included classes. A class's instructor count SHALL include its lead, assistant, and every additional instructor. A class's credited hours SHALL be the sum of its components' credited hours.

#### Scenario: Hours reflect class hours times people
- **WHEN** an included class has five credited hours, one instructor, and five students
- **THEN** the report counts five instructor hours and twenty-five student hours for that class

#### Scenario: Count every assigned instructor
- **WHEN** an included class has a lead, an assistant, and two additional instructors
- **THEN** the report counts four instructors for that class

#### Scenario: Multiply hours by the full instructor team
- **WHEN** an included three-hour class has a lead, an assistant, and one additional instructor
- **THEN** the report counts nine instructor hours for that class

#### Scenario: A student in two classes counts twice
- **WHEN** the same student has active attendance in two included classes
- **THEN** the student count includes that student once for each class

#### Scenario: Two classes at one site count as one site
- **WHEN** two included classes are held at the same training site
- **THEN** the site count is one

## ADDED Requirements

### Requirement: The certificate email presents the completion

Each certificate email SHALL address the participant by name, state formally that the named participant has completed the course, and present the course name, the completion date, the class hours, the lead instructor together with any assisting instructors, and the participant's represented agency. The message SHALL identify that the participant's signed certificate is attached.

#### Scenario: Present the class and instructor facts
- **WHEN** a certificate email is prepared for a participant
- **THEN** it shows the course, the completion date, the class hours, and the lead and assisting instructors

#### Scenario: Name the represented agency
- **WHEN** the participant's attendance recorded a represented agency
- **THEN** the message names that agency

#### Scenario: State completion formally
- **WHEN** a certificate email is prepared
- **THEN** the message states that the named participant has completed the course rather than only noting an attachment

#### Scenario: Identify the attachment
- **WHEN** a certificate email is prepared
- **THEN** the message tells the participant their signed certificate is attached

## ADDED Requirements

### Requirement: KFS-1A subject cells wrap long values

The system SHALL render each KFS-1A subject row's Class Name, Curriculum, and Lesson Plan value across up to two lines within its cell when the value does not fit on one line at a legible size. For those values the system SHALL use the largest text size that fits within the cell across the available lines rather than shrinking the value onto a single line. Values that fit on one line at a legible size SHALL render unchanged. This SHALL apply only to the KFS-1A subject rows; the KBEMS-E16 roster and all other fields SHALL be unaffected.

#### Scenario: Wrap a long curriculum label
- **WHEN** a finalized subject's Curriculum value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders the value across up to two lines within the Curriculum cell at a larger size than a single auto-shrunk line would use

#### Scenario: Wrap a long class name or lesson plan
- **WHEN** a finalized subject's Class Name or Lesson Plan value is longer than one line at a legible size
- **THEN** the generated KFS-1A renders that value across up to two lines within its cell

#### Scenario: Keep a short value on one line
- **WHEN** a finalized subject's Class Name, Curriculum, or Lesson Plan value fits on one line at a legible size
- **THEN** the generated KFS-1A renders it on a single line as before

#### Scenario: Leave other documents unchanged
- **WHEN** the system generates a KBEMS-E16 roster or a completion certificate
- **THEN** its layout and field rendering are unchanged by this behavior

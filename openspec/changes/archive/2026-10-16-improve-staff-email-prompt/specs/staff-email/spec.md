## MODIFIED Requirements

### Requirement: The staff area prompts an account without an email

The staff area SHALL present a prominent prompt band to a signed-in staff member whose account has no email, telling them to add one and linking to their profile. The band SHALL render full-bleed directly beneath the staff header, above the section navigation, SHALL use the department's signal palette with centered copy and an alert emphasis, and SHALL include a primary add-email call to action and a dismiss control. The band SHALL appear for every staff role and SHALL no longer appear once an email is stored. A dismissal SHALL apply only to the current sign-in: the band SHALL stay hidden for the remainder of that sign-in and SHALL return on the next successful sign-in while the account still has no email.

#### Scenario: Account has no email
- **WHEN** a signed-in staff member without an email opens a staff page
- **THEN** the staff area shows the prompt band beneath the header

#### Scenario: Present the band as a full-bleed notice
- **WHEN** the prompt band is shown
- **THEN** it spans the full width beneath the staff header, uses the signal palette, centers its message, and offers both the add-email action and a dismiss control

#### Scenario: Dismiss the band for the current sign-in
- **WHEN** the member dismisses the prompt band
- **THEN** the band is hidden for the remainder of the current sign-in

#### Scenario: The dismissal resets on the next sign-in
- **WHEN** the member signs in again while their account still has no email, even after dismissing the band previously
- **THEN** the prompt band is shown again

#### Scenario: Prompt clears after adding an email
- **WHEN** the member adds an email from their profile
- **THEN** the prompt no longer appears, whether or not it was dismissed

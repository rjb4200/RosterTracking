## ADDED Requirements

### Requirement: Per-scope attestation status on the review screen

The review screen SHALL present each required attestation scope separately, naming the signed scope, the signer, and the signed timestamp when it is complete, or naming the responsible signer when it is pending. When the operator is a pending scope's signer, the screen SHALL offer the sign action for that scope. The sign action SHALL NOT reopen the class, SHALL NOT offer attendance or class editing, and SHALL refresh the scope's status and document availability after it completes. The screen SHALL present a document family's view, print, download, and email actions only when that family's scope is attested, except for the legacy blank-signature fallback. The revision history SHALL show each revision's scopes and their signers.

#### Scenario: Show a signed scope
- **WHEN** an authorized operator opens the review screen for a finalized class
- **THEN** the screen names each completed scope, its signer, and its signed timestamp

#### Scenario: Show a pending scope to its signer
- **WHEN** the Fire signer opens the review screen for a finalized class whose `fire` scope is pending
- **THEN** the screen names the Fire signer as the pending signer and offers the Fire sign action

#### Scenario: Hide the sign action from other operators
- **WHEN** an operator who is not the pending scope's signer opens the review screen
- **THEN** the screen shows the pending status but does not offer that scope's sign action

#### Scenario: Reveal documents after attestation
- **WHEN** a scope becomes attested
- **THEN** its document view, print, download, and email actions become available without a page reload losing the operator's place

#### Scenario: Show per-scope history
- **WHEN** a class has more than one finalization revision
- **THEN** the revision history shows each revision's scopes, signers, and signed timestamps

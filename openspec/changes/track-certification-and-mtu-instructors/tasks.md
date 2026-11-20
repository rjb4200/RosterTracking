# Tasks

## 1. Data model and migration

- [x] 1.1 Add the external certificate issuer option list and type to the shared reference constants.
- [x] 1.2 Add `training_codes.external_cert_issuer`, `classes.issue_internal_cert`, and `users.mtu_instructor` to the Drizzle schema and generate the additive migration.
- [x] 1.3 Apply the migration to the dev database with `npm run db:migrate`.

## 2. Training-category external issuer

- [x] 2.1 Extend the training-code input schema and create/update/import services to accept and persist the optional issuer.
- [x] 2.2 Add the issuer selection to the training-category form and pass the stored value from the detail page.
- [x] 2.3 Accept the optional issuer in the reference provisioning import without requiring it.

## 3. Class internal-certificate flag

- [x] 3.1 Persist the class flag in class create and edit services, defaulting it on.
- [x] 3.2 Add the "Issue internal certificate" checkbox to the class creation workflow and open-class edit form.
- [x] 3.3 Resolve the applicable external issuer and freeze it with the internal-certificate flag in the finalization snapshot.
- [x] 3.4 Verify a finalized class cannot change the flag without reopening through the existing class lifecycle rules.

## 4. Certificate and email labeling

- [x] 4.1 Add the hours-record predicate and suffix and apply it to the certificate course field and signature line.
- [x] 4.2 Include the hours-record label in the certificate content fingerprint.
- [x] 4.3 Mark the certificate email subject and heading when the document is an hours record.
- [x] 4.4 Document the internal hours-record labeling in `docs/operations.md`.

## 5. Conditional delivery and individual sending

- [x] 5.1 Gate the automatic certificate batch at finalization on the frozen internal-certificate flag.
- [x] 5.2 Allow an individual certificate send when no prior delivery exists, preserving the KBEMS and attestation guards.
- [x] 5.3 Surface individual sending for a flag-off finalized class on the review screen.

## 6. External-certification completion notice

- [x] 6.1 Add the versioned completion-notice template and renderer with no attachment.
- [x] 6.2 Enqueue the completion notice at finalization when the revision has an external issuer and the internal-certificate flag is off.
- [x] 6.3 Record completion-notice deliveries so a delivery failure does not block finalization.

## 7. MTU instructor designation

- [x] 7.1 Add the MTU instructor checkbox to staff account creation and the account page, persisting and auditing it.
- [x] 7.2 Include the flag in the class instructor option query and show the MTU marker in the assignment UI and instructor list.
- [x] 7.3 Add the MTU instructor flag to each snapshot instructor as groundwork for the deferred hours report.

## 8. Integration verification

- [x] 8.1 Run `npm run lint` and resolve any reported issues.
- [x] 8.2 Run `npm run typecheck` and resolve any reported issues.
- [x] 8.3 Run `npm run test` and confirm the unit suites pass.
- [x] 8.4 Run `npm run test:integration` and confirm the database-backed suites pass.

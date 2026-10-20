## 1. Schema and migration

- [x] 1.1 Add canonical set helpers for delivery methods (`classroom,hands_on,online`) and KFS-1A methods (`cr,ho,ol`): parse, normalize, format, and reject empty or unknown values.
- [x] 1.2 Update `CLASS_DELIVERY_METHODS` and the related types so delivery is a set of modalities and `hybrid` is no longer a stored value.
- [x] 1.3 Relax the `classes_delivery_method` and `class_components_method` checks to allow every non-empty subset.
- [x] 1.4 Make `training_classes.training_site_id` not null and drop `classes_site_required`; keep the existing foreign key behavior.
- [x] 1.5 Generate a forward-only migration that backfills `hybrid` to `classroom,online`, creates or reuses a site named "Online" for null-site classes, assigns those classes, sets the site column not null, and drops the site check.
- [x] 1.6 Refresh the Drizzle snapshot and confirm the migration runs cleanly against a disposable branch.

## 2. Domain and server logic

- [x] 2.1 Update the delivery-to-method mapping to a set union: classroom→CR, hands_on→HO, online→OL; keep legacy `hybrid` normalization on read.
- [x] 2.2 Delete `validateDeliverySite` and its tests; require an active site for every class in `validateReferences`.
- [x] 2.3 Change `draftInput.deliveryMethod` and `componentInput.method` to accept canonical sets, and reject an empty delivery set or an empty session method set.
- [x] 2.4 Update class creation so each auto-created session receives the mapped default method set.
- [x] 2.5 Update class editing so a delivery change recalculates only sessions whose method still equals the previous default; preserve sessions that already differ.
- [x] 2.6 Normalize legacy `hybrid` when reading class and session records, including finalization snapshots and the class sign-in record.

## 3. Class creation UI

- [x] 3.1 Replace the wizard's delivery select with a checkbox group covering Classroom, Hands-On, and Online.
- [x] 3.2 Always show the training-site selector as required in the wizard; remove the online-only conditional and its validation path.
- [x] 3.3 Replace the wizard's decimal scheduled-duration input with an hours/minutes control using 15-minute increments and a hidden decimal value.
- [x] 3.4 Update the wizard review summary to list every delivery method and present the duration in hours and minutes.

## 4. Review and edit UI

- [x] 4.1 Replace `ClassForm`'s delivery select with a checkbox group and label the value as the default delivery.
- [x] 4.2 Make the `ClassForm` training-site select required and remove the "No site (online only)" option.
- [x] 4.3 Replace `ComponentForm`'s method select with a checkbox group for CR, HO, and OL, seeded from the class default for a new session.
- [x] 4.4 Replace `ComponentForm`'s decimal credited-hours input with the shared hours/minutes control in 15-minute increments.
- [x] 4.5 Show each session's recorded method set and formatted duration in the review and edit session rows.
- [x] 4.6 Update the post-class schedule area to present and edit session methods and hours with the new controls.

## 5. Display and formatting

- [x] 5.1 Format delivery sets as readable labels ("Classroom + Hands-On") in the class list, class summary, review header, sign-in record, and sign-in PDF.
- [x] 5.2 Replace the remaining decimal hour displays in the class summary, edit-page session badge, live roster, and sign-in record with `formatHours`.
- [x] 5.3 Keep the hours formatter used consistently for class summary, schedule summary, session rows, roster, and session editor values.

## 6. Tests

- [x] 6.1 Add unit tests for set parsing, normalization, formatting, the delivery-to-method union, and legacy `hybrid` reads.
- [x] 6.2 Add unit tests for the site requirement covering a site-less class of every delivery combination.
- [x] 6.3 Add integration tests for creating a class with multiple delivery methods and a required site.
- [x] 6.4 Add integration tests for session method defaults, independent overrides, and the default-change preservation rule.
- [x] 6.5 Add integration tests for session credited hours in 15-minute increments and rejection of other durations.
- [x] 6.6 Add browser coverage for the wizard's multi-select delivery, required site, and hours/minutes duration.
- [x] 6.7 Add browser coverage for the review/edit session method checkboxes and hours/minutes control.
- [x] 6.8 Update existing tests that assume a single delivery value, a `hybrid` value, a decimal hour input, or a site-less online class.

## 7. Verification

- [x] 7.1 Run `npm run check`, `npm run test`, and `npm run build`.
- [x] 7.2 Run the class-creation, review, and session-related integration and browser suites.
- [x] 7.3 Run `openspec validate flexible-delivery-and-session-hours --strict`.

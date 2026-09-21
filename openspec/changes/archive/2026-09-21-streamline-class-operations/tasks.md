## 1. Lifecycle and data model

- [x] 1.1 Remove `draft` from the class status set, status tone, and class-list draft handling
- [x] 1.2 Add a migration narrowing the `classes_status` check constraint; confirm no backfill is needed
- [x] 1.3 Remove the draft-only guards in `updateClassDraft`, `saveClassComponent`, and `assignClassInstructor` and allow setup edits while the class is open
- [x] 1.4 Remove or repurpose the draft-only services (`createClassDraft`/`createScheduledClassDraft`) and the `CLASS_LIST_DRAFT_MAX_AGE_DAYS` handling

## 2. Create and open

- [x] 2.1 Add an atomic create-and-open service that creates the class, session, host agency, reporting selections, lead instructor, and PIN in `open` status with readiness validation
- [x] 2.2 Reduce the wizard to three steps: Class, Reporting, Review
- [x] 2.3 Make the review step's action `Create & open` and remove the draft/`Continue class setup` outcome
- [x] 2.4 Show the sign-in link and QR only after the class is created open

## 3. Class page

- [x] 3.1 Rebuild `classes/[id]` as one page with a state-driven primary action (`Finish attendance & review` → `Finalize roster` → none)
- [x] 3.2 Remove the "Step 1..4" eyebrows and the duplicated inline class-edit form
- [x] 3.3 Keep a read-only active roster, manual attendance entry, and the sign-in-record link on the class page
- [x] 3.4 Make setup details editable while the class is open and read-only after finalization

## 4. Retire the roster page

- [x] 4.1 Delete the `classes/[id]/roster` route
- [x] 4.2 Remove every link to the roster route and repoint the sign-in-record link
- [x] 4.3 Ensure credited-hour and removal controls plus removed-attendance history live on the completed review step

## 5. Public directory display window

- [x] 5.1 Add named constants for the 18-hour pre-window and 36-hour post-window
- [x] 5.2 Filter `listPublicOpenClasses` to classes whose earliest session falls inside the window
- [x] 5.3 Confirm sign-in via short code or token is unaffected by the window

## 6. Verification

- [x] 6.1 Update and run unit tests
- [x] 6.2 Update and run integration tests
- [x] 6.3 Update and run the browser suite, including removal of roster-page coverage
- [x] 6.4 Run `npm run check` and `npm run build`

## 1. Preconditions

- [x] 1.1 Confirm `add-agency-tags` has landed; re-read `agencyInput`, `agency-form.tsx`, and `agencies/actions.ts` so the coordinator work builds on the tag-aware versions
- [x] 1.2 Add `trainingCoordinatorName`, `trainingCoordinatorPhone`, and `trainingCoordinatorEmail` nullable columns to the `agencies` table in `src/server/db/schema/reference.ts`
- [x] 1.3 Generate the additive migration (after the tags migrations) and apply it

## 2. Service and validation

- [x] 2.1 Extend `agencyInput` with optional coordinator name, phone, and email fields; validate the email with the existing optional-email rule
- [x] 2.2 In `createAgency`, persist the coordinator fields, normalizing a non-empty coordinator phone via `normalizePhone` and guarding the call so blank stays blank
- [x] 2.3 In `updateAgency`, persist the coordinator fields with the same normalization guard
- [x] 2.4 Confirm `listAgencies`/`getAgency` return the new columns without further projection changes

## 3. UI and actions

- [x] 3.1 Add a training-coordinator block (name, phone, email) to `agencies/agency-form.tsx` with the `Training coordinator` label
- [x] 3.2 Read the three coordinator fields in `createAgencyAction` and pass them to the service
- [x] 3.3 Read the three coordinator fields in `updateAgencyAction` and pass them to the service
- [x] 3.4 Pass the coordinator values into the form from `agencies/[id]/page.tsx`

## 4. Tests

- [x] 4.1 Integration: create an agency with valid coordinator name, phone, and email; assert the phone is stored as `+1XXXXXXXXXX`
- [x] 4.2 Integration: edit an agency's coordinator details and assert the update persists
- [x] 4.3 Integration: reject an invalid coordinator phone number and an invalid coordinator email
- [x] 4.4 Integration: create an agency with a coordinator name but blank phone and email without error

## 5. Verification

- [x] 5.1 Run `npm run check`
- [x] 5.2 Run `npm run test` and `npm run test:integration`

## 1. Services

- [x] 1.1 Make the source revision optional in the curriculum and training-code write schemas and default it to `manual`
- [x] 1.2 Default the chapter write schema's source revision to `manual` without an input

## 2. Forms, lists, and actions

- [x] 2.1 Remove the source-revision field from `curriculum-form.tsx`, `training-code-form.tsx`, and `curriculum-chapter-form.tsx`
- [x] 2.2 Remove the source-revision column from the curricula and training-codes lists
- [x] 2.3 Simplify the curriculum, training-code, and chapter actions to stop reading the source revision

## 3. Tests and verification

- [x] 3.1 Update the reference-create tests to stop supplying a source revision and assert the `manual` default
- [x] 3.2 Run `npm run check`, `npm run test`, the touched integration tests, and `npm run build`

## 4. Docs

- [x] 4.1 Note that reference records are authored without a source revision (defaulted to `manual`) in the reference-data docs

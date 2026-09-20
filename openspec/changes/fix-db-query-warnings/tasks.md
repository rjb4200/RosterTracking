## 1. Transaction query hygiene

- [x] 1.1 Sequentialize the `Promise.all` block in `transitionClass` (`src/modules/classes/services.ts`) so its four reads run in order on the transaction client
- [x] 1.2 Sequentialize the `Promise.all` block in `getClassDetail` (`src/modules/classes/services.ts`) while keeping the `requireClassAccess` gate before the reads
- [x] 1.3 Sequentialize the `Promise.all` block in `buildSnapshot` (`src/modules/classes/finalization.ts`) so finalization and official-roster generation stop sharing the client concurrently
- [x] 1.4 Confirm no `Promise.all` of transaction queries remains inside a `db.transaction` callback

## 2. Public directory N+1

- [x] 2.1 Add `training_classes.id` to the outer projection in `listPublicOpenClasses`
- [x] 2.2 Fetch all `class_components` for the selected class ids in one ordered query and derive the earliest session per class
- [x] 2.3 Fetch all `class_instructors` for the selected class ids in one query ordered by class, lead-first, then display name, and group per class
- [x] 2.4 Keep the existing location label and `"F. Last"` instructor formatting unchanged
- [x] 2.5 Confirm the function issues a fixed three queries regardless of the number of open classes

## 3. Explicit TLS mode

- [x] 3.1 Update `.env.example` to use `sslmode=verify-full` and note why
- [ ] 3.2 Update `DATABASE_URL` on Vercel to `sslmode=verify-full` (operator action)
- [ ] 3.3 Verify a preview deployment connects cleanly with no SSL-mode warning on cold start; fall back to `uselibpqcompat=true&sslmode=require` only if the certificate cannot be validated

## 4. Verification

- [x] 4.1 Run `npm run check` (lint + typecheck)
- [x] 4.2 Run unit tests (`npm run test`)
- [x] 4.3 Run integration tests (`npm run db:reset:integration` then `npm run test:integration`)
- [x] 4.4 Run `npm run build`
- [x] 4.5 Run the browser suite in production mode, or at minimum the specs that touch the landing page and class pages
- [x] 4.6 Confirm the public directory still lists the same open classes with the same sessions and instructor names
- [ ] 4.7 Confirm preview/production logs show neither the `client.query()` deprecation nor the SSL-mode warning on the affected routes

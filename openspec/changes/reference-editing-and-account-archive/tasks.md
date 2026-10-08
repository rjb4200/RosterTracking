## 1. Schema

- [x] 1.1 Add a nullable `archived_at` to `users`, with a migration

## 2. Services

- [x] 2.1 Add staff-account archive: archive an account (refusing the acting Administrator and the last active Administrator), hide archived accounts from the list, and revive an archived account when its username is created again
- [x] 2.2 Add create and update for training codes
- [x] 2.3 Add create and update for approved curricula
- [x] 2.4 Relax the FFN rule to digits only (no dash, no fixed length) in `profile-contract.ts` and update the profile placeholder

## 3. Management screens

- [x] 3.1 Add an Archive action to the staff accounts screen
- [x] 3.2 Add an Add form and an Edit action to the training-codes screen
- [x] 3.3 Add an Add form and an Edit action to the curricula screen

## 4. Verification

- [x] 4.1 Add tests for archiving (guards, hidden from list, revive on re-create), for creating/editing training codes and curricula, and for the digits-only FFN
- [x] 4.2 Run `npm run check`, `npm run test`, and `npm run test:integration`

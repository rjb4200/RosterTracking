# Environment Workflow — Development and Production

How to work on this application without ever touching live data, and how to move
changes into production safely. This describes the target state established by the
`establish-database-environments` change; until that change is applied, follow it
as the intended workflow.

## The environment map

```
 local dev  ──▶ .env ──────────────▶ development database   (formerly production; disposable)
 GitHub dev ──▶ Vercel Preview ────▶ development database
 GitHub main─▶ Vercel Production ──▶ production database    (new; protected, immutable)
 local/CI   ──▶ test suite only ───▶ roster_integration / roster_e2e
 public     ──▶ rosterdev.<domain> ▶ development database   (dev origin, noindex)
 public     ──▶ roster.<domain>    ▶ production database
```

## Golden rules

1. **Local dev never points at production.** If your `.env` `DATABASE_URL` host
   matches the production database, stop and fix it before doing anything else.
2. **`main` is production.** Never commit directly to it; open a pull request from `dev`.
3. **The production database is never a target of a script.** Maintenance and data
   commands refuse it by default; only an explicit, approved override touches it.
4. **Nothing is deleted to "reset" a database.** Production is *built* from committed
   sources; the development database is disposable and can be re-provisioned.
5. **Development never emails real people.** The dev environment has no live
   `RESEND_API_KEY`.
6. **One origin per environment.** Dev links/QRs use the dev origin; production uses
   the production origin; they never cross.

## Day-to-day development

```
  1. git switch dev && git pull
  2. work, run: npm run dev
  3. quick signal: npm run check
  4. full local:  npm run verify
  5. commit to a feature branch off dev, push, open a PR into dev
```

Your local `.env` points at the development database (the former production
database, still holding the historical test data as fixtures). If you ever need a
clean development database, re-provision one:

```
npm run provision   # builds a fresh, empty target from committed sources
```

## Types of change and where they go

```
  code change (UI, logic)          → dev branch → PR → main → production deploy
  schema change (migration)        → dev branch → PR → main → migrate production (deliberate step)
  reference data (curricula/codes) → update the committed source → import on dev → verify → approved production import
  secret/config change             → Vercel env scoping, per environment
```

## Reference data lives in source

Reference data (curricula and their chapters, training codes, and the MTU
catalog) is reproducible from committed sources under `scripts/data/` and the
seed code. Host agencies and training sites are created by hand in the app.

- To change a code or curriculum, edit the committed source and re-run the import.
- To capture changes made in the app's UI into source, run `npm run export:reference`
  (read-only) and commit the result.

## Code changes: promotion path

```
 feature branch ──PR──▶ dev ──(preview deploy, dev DB)──▶ PR──▶ main ──▶ production
                         ▲                                        │
                         └──────── CI must be green ──────────────┘
```

1. Branch off `dev`; open a PR into `dev`. The preview deployment uses the dev DB.
2. Verify on the dev origin (`rosterdev.<domain>`), including sign-in and QR if relevant.
3. Merge `dev` → `main` only through a PR with passing checks.
4. Merging to `main` deploys production automatically against the production database.

## Schema changes: migrations

Migrations are forward-only and reviewed like code.

1. On `dev`, generate and apply the migration to the development database:
   `npm run db:generate` then `npm run db:migrate`.
2. Verify the app against the development database.
3. Merge through `dev` → `main` as usual.
4. Apply to production **deliberately**, as its own step, with the explicit override:
   take a production snapshot first, then migrate production with the approved override.

## Applying reference data to production safely

```
  1. Update the committed source and import it against the development database.
  2. Verify counts and spot-check entries.
  3. For production: take a snapshot, then run the import with the explicit override.
     Reference imports archive rather than delete, so history is kept.
```

## Emergencies and rollback

- **Bad deploy:** roll back in Vercel to the previous production deployment.
- **Bad data change:** restore the production snapshot onto the production database,
  or provision a fresh database from sources and repoint.
- **Wrong database hit:** repoint the affected environment's `DATABASE_URL`; no data
  is lost because nothing is deleted in place.

## Pre-merge checklist

```
[ ] Work is on a branch off dev, not main
[ ] npm run check passes
[ ] npm run verify passes
[ ] Preview deploy verified on the dev origin
[ ] No production credentials used locally
[ ] No .env or secret files staged
[ ] If reference data changed: source updated and imported on dev first
```

## If you are ever unsure

Ask three questions before any command that writes:

1. **Which database will this touch?** Check `DATABASE_URL` / `DATABASE_URL_DIRECT`.
2. **Is there a snapshot?** If not, take one.
3. **Is this supposed to be production?** If not, the command should refuse — if it
   does not, stop.

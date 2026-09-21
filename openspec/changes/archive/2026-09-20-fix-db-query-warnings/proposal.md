## Why

Production logs carry two warnings on routine staff and public routes — pg's SSL-mode alias warning and the `client.query()` deprecation — and the public landing page issues `1 + 2N` queries for `N` open classes. Nothing fails today (every affected request returns 200), but the deprecation becomes a behavior change in pg v9, and the landing page is the heaviest uncached public read.

## What Changes

- **Sequentialize the three transaction `Promise.all` blocks** so no two queries are issued on the same checked-out pg client. The pg client serializes those queries today anyway, so this removes the deprecation warning at no latency cost.
- **Make the TLS mode explicit** in the database connection string so `pg-connection-string` stops warning that `sslmode=require` is being treated as an alias for `verify-full`. Keeps the current verification strength.
- **Collapse `listPublicOpenClasses` from `1 + 2N` queries to three queries**, grouping the session and instructor rows in application code.
- Behavior-preserving throughout: identical directory content, identical transaction results, identical TLS verification.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. This change alters implementation and configuration only — no spec-level behavior changes. `skip_specs: true` is set accordingly.

## Impact

- **Modules**: `src/modules/classes/services.ts` (`transitionClass`, `getClassDetail`, `listPublicOpenClasses`) and `src/modules/classes/finalization.ts` (`buildSnapshot`).
- **Config**: `DATABASE_URL` in Vercel and the documented value in `.env.example`; possibly `src/server/db/client.ts` if the TLS decision moves into the pool options.
- **Dependencies**: forward-compatibility with `pg` v9.
- **Routes affected**: `GET`/`POST /staff/classes/[id]`, finalization and official-roster generation, and the public landing page.
- **Testing**: existing unit, integration, and browser suites already exercise the directory and class pages; the rewrite needs a regression check that the directory output is unchanged.

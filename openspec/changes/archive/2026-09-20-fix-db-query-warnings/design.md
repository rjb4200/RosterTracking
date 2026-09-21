## Context

See `proposal.md` — Why.

The runtime uses one process-wide `pg.Pool` with `max: 3` (`src/server/db/client.ts`), wrapped by Drizzle's `node-postgres` driver. Pool-level queries (`db.select(...)`) each check out their own connection, so concurrent pool queries are safe. Transaction queries (`tx.select(...)` inside `db.transaction(...)`) all share one checked-out client.

Three transaction callbacks fan out with `Promise.all`:

| Location | Function | Reached by |
| --- | --- | --- |
| `src/modules/classes/services.ts:590` | `transitionClass` | `POST /staff/classes/[id]` |
| `src/modules/classes/services.ts:1138` | `getClassDetail` | `GET /staff/classes/[id]` |
| `src/modules/classes/finalization.ts:138` | `buildSnapshot` | finalization and official-roster generation |

`pg` serializes those queries on the single client but deprecates issuing them concurrently.

Separately, `listPublicOpenClasses` (`src/modules/classes/services.ts:780`) selects up to 100 open classes, then issues two more queries per class (earliest `class_components` row, ordered `class_instructors`), for `1 + 2N` queries on an uncached, public page. Each per-class query re-joins `training_classes` and filters on `public_code`, even though the outer query already identified the class.

`DATABASE_URL` currently carries `?sslmode=require` (per `.env.example`), which `pg-connection-string` treats as an alias for `verify-full` and warns about.

## Goals / Non-Goals

**Goals:**
- Remove both pg warnings from production logs without changing observable behavior.
- Make the public directory's query count independent of the number of open classes.
- Keep the change small, read-only where possible, and covered by existing suites.

**Non-Goals:**
- No schema, API, or spec-level behavior change.
- No change to pool sizing, connection lifecycle, or `attachDatabasePool` behavior.
- Not addressing the per-class QR generation cost on the landing page (separate, CPU-bound).
- Not refactoring the many pool-level `Promise.all` calls — they are correct as-is.

## Decisions

### D1 — Sequentialize the three transaction blocks (Option A)

Replace each `Promise.all([tx.select(...), ...])` inside a `db.transaction(...)` callback with sequential `await`s.

- **Why**: `pg` serializes queries on a single client anyway, so sequentializing removes the warning with **no lost parallelism**. It is the smallest diff and preserves the transaction's read-consistency and authorization gating (`requireClassAccess`/`requireAssignedInstructor` still run inside the same transaction).
- **Alternatives considered**:
  - *Move independent reads onto the pool* — real parallelism, but drops the transaction snapshot and complicates the authorization-before-read ordering. Not worth it for small reads.
  - *Pin `pg` to 8.x and ignore* — keeps log noise and breaks on `pg` v9.

### D2 — Make the TLS mode explicit in the connection string

Set `sslmode=verify-full` in `DATABASE_URL` (Vercel) and in `.env.example`. Config-only; no code change.

- **Why**: `verify-full` is exactly what `require` is aliased to today, so verification strength is unchanged, and it silences the warning. It states the intent rather than relying on an alias.
- **Alternatives considered**:
  - `uselibpqcompat=true&sslmode=require` — explicit libpq compatibility, but keeps the weaker-looking mode and the warning opt-out; use only as the fallback in D2's risk.
  - Move the decision to `ssl: { rejectUnauthorized: true }` in `Pool` options — spreads TLS config across code and env; skip unless the connection string must stay untouched.
- **Verification gate**: confirm `verify-full` connects from the Vercel runtime (Neon's certificate must be in the runtime trust store) on a preview deployment before promoting.

### D3 — Collapse the public directory to three queries

Rewrite `listPublicOpenClasses` to:

1. Select open classes (adding `training_classes.id` to the projection).
2. One `class_components` query for all selected class ids, ordered by `startsAt`.
3. One `class_instructors` query for all selected class ids, ordered by `classId, isLead desc, displayName`.
4. Group in application code: first component per class becomes `nextSession`; instructor rows per class keep their order and existing `"F. Last"` formatting.

- **Why**: fixed three queries regardless of `N`, uses `inArray(classId, ids)` instead of re-joining on `public_code`, and reads more clearly than a window-function rewrite. Matches the codebase's style of composing Drizzle selects and shaping in JS.
- **Alternatives considered**:
  - `DISTINCT ON (class_id)` plus `array_agg` — one fewer round trip, but harder to read and to keep the instructor ordering/formatting explicit.
  - Caching the directory — premature at 7–8 open classes and adds invalidation surface.

## Risks / Trade-offs

- **`verify-full` rejected by the runtime trust store** → verify on a preview deployment first; fall back to `uselibpqcompat=true&sslmode=require` if the certificate cannot be validated.
- **Latency regression from sequentializing** → none expected because the client already serialized; confirm by comparing the affected routes' duration before and after.
- **Directory output drift** (ordering, earliest session, instructor formatting) → keep the global `order by` and group in a `Map` so per-class order is preserved; assert the directory renders the same entries in the existing browser coverage.
- **`inArray` with up to 100 ids** → acceptable; revisit only if the directory limit changes.

## Migration Plan

1. Land the code change (three transaction blocks + directory rewrite) with tests.
2. Verify on a preview deployment that no pg warnings appear and the directory output is unchanged.
3. Update `DATABASE_URL` on Vercel to `sslmode=verify-full` and `.env.example` to match; confirm a clean cold start.
4. **Rollback**: revert the commit for code; revert the `DATABASE_URL` value for the TLS change — both are independent and reversible.

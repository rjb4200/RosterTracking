## Context

See proposal.md - Why. The relevant current mechanism:

- `src/app/[code]/route.ts` resolves the public code, creates the sign-in
  workflow row through `createWorkflowFromOpenClass`, and returns a `307` with
  `Set-Cookie: roster_sign_in_context=...; Path=/sign-in; Secure; HttpOnly; SameSite=lax`.
- The student reaches that route from a **cross-site** navigation (camera app,
  messaging app, link preview).
- A cookie set on a response to a cross-site navigation is a third-party cookie.
  `SameSite=Lax` is not accepted in that context; only `SameSite=None; Secure`
  is. Browsers therefore discard the cookie, and the first Server Action POST
  finds no context.
- Production diagnostics show this exactly: after a cross-site `/H4CX` entry the
  first POSTs report `hasCookieHeader: false, cookieCount: 0`, and later POSTs
  report three unrelated cookies with `contextCookieCount: 0`.
- Guest sign-in works on the same device because by then `/sign-in` is
  first-party and a fresh navigation re-establishes the cookie.

A second constraint shapes the design: the sign-in workflow row is created by the
entry route, and its nonce/idempotency state drives later stages. The design must
move *where the cookie is issued* without losing that state.

## Goals / Non-Goals

**Goals**

- Establish the sign-in context on a first-party response so a cross-site arrival
  produces a usable session.
- Keep the context cookie's security attributes unchanged (`HttpOnly`, `Secure`
  in production, `SameSite=Lax`, path limited to the sign-in route, short TTL).
- Keep unknown-code, closed-class, and PIN failures returning the same generic
  response with no class detail.
- Preserve the remembered-device recognition path.

**Non-Goals**

- Changing the database schema or the workflow state model.
- Weakening the cookie to `SameSite=None`, which would trade the bug for a
  broader cross-site exposure.
- Fixing the separate observation that production holds only fixture data.
- Reducing the context TTL or altering rate-limit rules.

## Decisions

### Decision: mint the context on the `/sign-in` GET, not the entry redirect

The entry route resolves the class and redirects; `/sign-in` creates the
workflow and sets the cookie on its own `200` response. A `Set-Cookie` on a
same-site `200` is stored reliably regardless of how the visitor arrived.

*Alternative considered:* set `SameSite=None; Secure` on the entry redirect.
Rejected — it makes the context cookie a genuine third-party cookie and broadens
its exposure, which is a worse trade than moving where it is issued.

*Alternative considered:* keep the entry cookie and re-mint on `/sign-in` as a
fallback. Rejected as the primary approach because the entry cookie is dead
weight on every cross-site arrival; a fallback may still be worth keeping for
in-flight sessions (see Risks).

### Decision: carry the class reference in the URL, not a cookie

The entry route redirects to `/sign-in?class=<code>` (or the token form) so the
page can resolve the class first-party. The public code is already public and
already appears in the entry URL, so this adds no disclosure. The page validates
the code against an open class exactly as the entry route does today, so an
inactive class still yields the generic unavailable response.

*Alternative considered:* hand the workflow token through a query parameter.
Rejected — that would put signed context material in a URL, where it can leak
through history, referrers, and logs.

*Alternative considered:* a server-side pending-workflow table keyed by the
class. Rejected as unnecessary coupling and cleanup burden; the class reference
plus a page-side mint is simpler and idempotent.

### Decision: minting is idempotent and reuses a valid existing context

If the request already carries a valid, unexpired context for the same class,
the page reuses it rather than minting a new one, so a reload does not discard
progress. A new workflow is created only when the context is absent, invalid,
expired, or for a different class.

*Alternative considered:* always mint on GET. Rejected — a reload mid-flow would
reset the student's progress.

## Risks / Trade-offs

[Minting on the page means rate-limit accounting moves to the page GET] → The
page must apply the same workflow-creation and staging limits the entry route
applies today, and record a failure when a limit denies. Otherwise a page GET
becomes an unmetered way to create workflow rows.

[The remembered-device cookie is also set from the entry route] → Recognition
must move with the minting so the remembered path still reaches the confirm
step. The remembered cookie already uses `Path=/`, and is set on the page
response, which is first-party.

[In-flight sessions created by the current code keep a cookie browsers already
discarded] → No migration is needed; those sessions are already unusable. The
page mints a fresh context when none is present, which is the recovery path.

[A page GET that mints a workflow can be replayed to create many workflow rows]
→ Reuse of a valid existing context bounds this, and the workflow-creation rate
limit applies per class and request source.

[An old `/sign-in` URL without a class reference is now contextless] → The page
returns the generic unavailable response when it cannot resolve an open class,
matching today's behaviour for a missing context.

## Migration Plan

1. Add the page-side mint and the class reference to the entry redirects behind
   the existing code paths.
2. Confirm the entry routes no longer set the context cookie.
3. Verify the cross-site arrival path on a real device, since a synthetic
   desktop navigation does not reproduce the browser rule.
4. Rollback: revert the entry redirect and the page mint together. No schema
   change and no data migration, so rollback is a code-only revert.

### Decision: entry routes actively clear any legacy context cookie

The entry routes keep a clearing `Set-Cookie` for the context cookie (empty
value, zero lifetime) even though they no longer issue it. Browsers that stored a
context cookie during the previous release would otherwise hold a stale value for
up to the cookie's lifetime, which could shadow or contradict the freshly minted
one. Clearing on entry bounds that window to a single request.

*Alternative considered:* remove all context-cookie handling from the entry
routes. Rejected — it leaves a stale cookie in some browsers with no way to
correct it, which is the same class of fault this change exists to fix.

## Open Questions

None. The legacy-cookie decision above is settled.

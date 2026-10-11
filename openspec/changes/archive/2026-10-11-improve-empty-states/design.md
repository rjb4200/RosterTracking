## Context

See `proposal.md` for motivation. Empty states are currently hand-written strings scattered across dashboards and list pages, rendered through three different markup patterns and four CSS classes (`.operational-empty`, `.public-class-empty`, `text-muted-foreground`, inline cells). None of them carry context or a next step, and several list pages already have the data needed to tell the difference between "nothing exists" and "your search matched nothing".

The staff surfaces use two structural contexts: a page section (dashboards, public directory) and a table cell (reference lists, students, accounts, MTU catalog, class list). Almost every reference list page already receives a `q` search parameter, and the dashboards already derive `overdue`, `today`, and `upcoming` collections from a single `listOperationalClasses` call.

## Goals / Non-Goals

**Goals:**
- One reusable `EmptyState` primitive used by every major staff and public empty state.
- Empty states that explain the absence and offer a next action when one exists.
- Search-aware list empty states that separate "no records yet" from "no matches".
- Dashboard empty states that confirm reassurance or surface the next upcoming class.
- Retire the ad-hoc markup and legacy empty-state CSS.

**Non-Goals:**
- Inline detail sub-section empties (student memberships and credentials, sign-in attestation, class summary "No sessions") are out of scope; they are lower-value and handled later if at all.
- Form placeholder labels (`<option>No site</option>`), the interactive `search-select` "No matches" state, and the already-reassuring reporting-queue message are unchanged.
- No tone/color variant axis in this change.
- No data-model, API, permission, or migration changes.

## Decisions

### One primitive, taxonomy expressed through props

`src/components/ui/empty-state.tsx` exposes an optional `icon`, a required `title`, an optional `description`, and an optional `action` node. The intent taxonomy (reassurance, orientation, action) is expressed by which props a call site passes, not by a `variant` prop. Reassurance omits `action`; action includes it; orientation supplies a data-driven `description`.

- Alternatives considered: three per-family components (duplication, no single consistency point); a `variant` enum (adds a styling surface the issue does not ask for and tempts over-design).

### `description` is a `ReactNode`, not a `string`

This is the escape hatch that lets dashboards stay data-driven ("Your next class is CPR Instructor tomorrow at 9:00 AM.") while keeping the primitive content-only and routing-agnostic. The page owns the "what is next" logic.

- Alternatives considered: a separate context-helper module that computes descriptions (couples the primitive to domain concepts); a plain `string` (forces string interpolation at every call site and cannot embed a link).

### The primitive is a server component and takes `action` as a node

No `"use client"` directive; `action` is a caller-provided `<Link>`/`Button`, so the primitive never imports routing or decides destinations.

- Alternatives considered: baking a `href`/`label` action into the primitive (loses icon/label flexibility and couples it to Next routing).

### Search-awareness is decided at the call site from the existing query

List pages already hold the active search term (and, for the class list, the filter values). Each page chooses the "no records yet" empty state when no search/filter is active and the "no matches" empty state when one is. No change to the services layer.

- Alternatives considered: inferring emptiness cause from the returned row count (impossible — `[]` is identical either way); pushing a cause flag through every `list*` service (larger blast radius for no benefit).

### The dashboard "today" empty state reads the upcoming collection

The instructor page already computes `upcoming` from the same `classes` result used for `today`, so the next class is available without a new query. The "today" empty state names `upcoming[0]` with its formatted date and time. The derivation stays in the page, not the primitive.

- Alternative considered: a dedicated "next class" query (redundant; the data is already loaded).

### Table empties stay content-only; the row and `colSpan` stay at the call site

The primitive renders a block element placed inside a caller-owned `<TableCell colSpan={n}>` wrapped in its `<TableRow>`. `colSpan` is table structure, not empty-state presentation.

- Alternatives considered: a companion `TableEmptyRow` component (spreads table-structure knowledge into the UI kit for little gain).

### Retire the legacy CSS in favor of tokens

`.operational-empty` and `.public-class-empty` are removed; the primitive uses the same token-based Tailwind conventions as `Badge`/`Table` (`text-muted-foreground`, `text-foreground`, `data-slot`).

- Alternatives considered: keeping the bespoke CSS (perpetuates the three-way inconsistency the change exists to remove).

## Risks / Trade-offs

- [The class list has default filters, so "filtered to nothing" is not simply "a query is present"] → Determine the filtered state by comparing active filter/query values against their defaults, not by their mere presence.
- [The cross-section "next class" derivation is non-obvious and could be "simplified" back to a static string] → Cover it with an explicit scenario in `operational-class-dashboards` and a task note.
- [Reassurance states could become nagging if an action is added] → The `empty-state-guidance` requirement forbids an action on a reassurance; keep wording short.
- [Repeating the create action inside the empty state can feel redundant beside the page header action] → Accept the minor redundancy for discoverability; keep the empty-state action a single concise control.

## Open Questions

- Whether a future tone/color variant (for example a success-tinted "all clear") is worth adding once the text-only version is seen in use. Deferrable; it would only add presentation, not change the specs or tasks.

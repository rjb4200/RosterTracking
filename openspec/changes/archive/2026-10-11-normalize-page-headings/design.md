## Context

See `proposal.md` - Why. The staff surfaces already have a precedent for this exact problem: `improve-empty-states` introduced `src/components/ui/empty-state.tsx` as a single presentation primitive with "taxonomy expressed through props," no `variant` enum, a server component, and a caller-provided `action` node kept routing-agnostic. Headings never received the equivalent, so ~25 pages hand-write the same `admin-heading` structure and pick button variants by hand.

Current state observed in the code:

- `admin-heading` is a flex row: a text block (`.eyebrow` + `.staff-title` + optional meta) on the left and `.admin-actions` on the right, defined in `src/app/globals.css`.
- The primary "New X" heading action is `secondary` (grey) on sites, agencies, accounts, curricula, training-codes, and mtu-catalog, but `default` (black) on students and classes.
- The same pages' empty-state create action is already `default` everywhere, so a page can show two different styles for the same action.
- `default size lg` is used for the dashboard "Create class" hero on `admin` and `instructor`.
- Detail pages put a `Back` (`outline`) plus an activate/deactivate form or a status `Badge` in `.admin-actions`.

## Goals / Non-Goals

**Goals:**
- One heading primitive used by every staff page.
- A page's create action rendered through the primitive so its variant is fixed in one place.
- A written variant contract so "grey vs black" stops being a per-page choice.

**Non-Goals:**
- No change to the button variant set itself, to `Badge`, or to `EmptyState`.
- No change to navigation styling drift (`back-link-plain` text links vs `outline` Back buttons); left as a deferrable follow-up.
- No data-model, API, permission, or migration changes.

## Decisions

### `PageHeading` mirrors `EmptyState`'s shape

`src/components/ui/page-heading.tsx` exposes `eyebrow`, `title`, optional `meta` (a node for subtitle/tags/badges), an optional `primary` action, and an optional `actions` node. It is a server component with a `data-slot`, matching the existing UI kit.

- Alternatives considered: a `variant` enum on the heading (no basis - headings do not have variants, only their actions do); a CSS-only convention (cannot prevent a page from picking the wrong button variant).

### The primitive owns the primary action, but not arbitrary actions

The heading's single primary action is declared as data - `primary={{ href, label, size? }}` - and the primitive renders it with the primary variant. Supporting and navigation controls are passed through the routing-agnostic `actions` node exactly as `EmptyState` takes its `action`. This is the mechanism that makes the variant drift impossible for the create action while leaving the primitive otherwise free of routing.

- Alternatives considered: an `actions`-only node where the caller writes `buttonVariants({ variant })` (the current situation - drift remains possible); a spec-only convention enforced by review (no mechanism, will drift again).

### Keep Next routing out of the heading itself

`PageHeading` never imports `next/link`. The tiny routing-aware piece is a leaf used only when `primary` is present. This preserves the boundary `EmptyState` established: the layout primitive stays presentational, and the one place that needs a destination is isolated and takes `href` as a prop.

- Alternatives considered: importing `Link` into `PageHeading` directly (spreads routing through the shared kit); reusing `EmptyState`'s `action` slot for the primary action (loses the guarantee that the primary variant is applied).

### Hero actions stay a size, not a variant

`primary.size` accepts the standard button sizes, so dashboards can render a larger `lg` class-creation hero while still using the primary variant.

- Alternatives considered: a separate "hero" variant (reintroduces the grey/black ambiguity one level up); treating dashboards as out of scope (leaves two primary-action treatments).

### Keep the existing layout classes as the hook

The primitive renders `admin-heading` / `admin-actions` so global CSS and the responsive rules are unchanged and the migration is visually neutral apart from intended variant fixes.

- Alternatives considered: rewriting the layout in Tailwind inside the primitive (unnecessary churn and a second styling system to reconcile).

## Risks / Trade-offs

- [The UI kit now contains one routing-aware leaf, diluting the "agnostic primitive" rule] → Keep routing confined to the primary-action leaf; `PageHeading` and `EmptyState` stay presentational.
- [Detail pages have varied shapes (Back + toggle form, status badge, no action at all)] → The `actions` node accepts any node; the primitive only fixes the left-hand structure and, when given, the primary action.
- [A 25-page single-pass migration can regress layout] → Keep the same classes so layout is byte-for-byte equivalent; the only intended visual change is the variant on the six mislabeled headers.
- [Repeating the create action in the heading and the empty state stays redundant] → Accepted in `improve-empty-states`; this change at least makes the two identical instead of different.

## Migration Plan

1. Add `src/components/ui/page-heading.tsx`.
2. Replace each `admin-heading` block with `PageHeading`, passing `primary` for list/dashboard create actions and `actions` for detail-page Back/status controls.
3. The six secondary "New X" headers become the primary variant; students, classes, and the dashboards are already primary and only need the markup swapped.
4. No deployment or rollback steps; no persisted state is affected.

## Open Questions

- Navigation drift (`back-link-plain` text links on `*/new` and some `[id]` pages vs `outline` Back buttons on others) is deliberately out of scope here and can be normalized in a later change without touching this one.

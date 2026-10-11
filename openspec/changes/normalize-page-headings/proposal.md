## Why

Staff page headers are hand-written in roughly 25 places, so the same primary "New X" action renders black on some pages and grey on others, and sometimes differs from the black create action inside that page's own empty state. Empty states already share one primitive (`EmptyState`); headings never got the equivalent, so presentation drifts silently and the button variant has lost any fixed meaning.

## What Changes

- Add a shared `PageHeading` primitive (server component, same conventions as `EmptyState`) that owns the eyebrow/title/meta and actions layout, so the heading structure is defined once.
- Render the page's single primary action through the primitive so its variant cannot be hand-picked incorrectly, using a small routing-aware primary-action link.
- Pin the button-variant contract: `default` is the page's one primary action (create / submit-and-advance), `secondary` is a supporting in-page action, `outline` is navigation.
- Migrate all `admin-heading` usages to the primitive in one pass, including list pages, detail pages, dashboards, the reporting queue, and the error surface.
- Correct the headers that currently use the secondary (grey) variant for a primary "New X" action so every create action is the primary variant.
- Keep the dashboard hero CTAs ("Create class") deliberately larger as an intentional hero treatment, using a size option rather than a different variant.
- Remove the duplicated `admin-heading` markup; keep the layout class as the primitive's hook.

## Capabilities

### New Capabilities
- `page-heading-guidance`: how staff page headings present a title and exactly one primary action consistently, and what each button variant means.

### Modified Capabilities
<!-- No existing capability changes at the requirement level; page behaviors are unchanged. -->

## Impact

- New: `src/components/ui/page-heading.tsx`.
- Updated: every staff page under `src/app/staff/(protected)/**` that renders `admin-heading` (list pages, `[id]` detail pages, `admin`, `instructor`, `reporting`, the class wizard, the error surface).
- `src/app/globals.css`: the `.admin-heading` / `.admin-actions` rules are retained as the primitive's layout hook or folded into it.
- No data-model, API, permission, or migration changes.

## 1. Add the heading primitive

- [x] 1.1 Create `src/components/ui/page-heading.tsx` (server component, `data-slot="page-heading"`) accepting `eyebrow`, `title`, optional `meta` node, optional `primary={{ href, label, size? }}`, and an optional `actions` node; render the existing `admin-heading` / `admin-actions` markup
- [x] 1.2 Render the `primary` action through a small routing-aware leaf that applies the primary button variant, so callers never pick the variant for a create action
- [x] 1.3 Add a short comment in `src/components/ui/button.tsx` recording the variant contract: primary variant = a page's single primary action, secondary = supporting in-page action, outline = navigation

## 2. Migrate list pages that offer a create action

- [x] 2.1 `src/app/staff/(protected)/sites/page.tsx` - move the header action to `primary` (fixes grey to black)
- [x] 2.2 `src/app/staff/(protected)/agencies/page.tsx` - move to `primary` (fixes grey to black)
- [x] 2.3 `src/app/staff/(protected)/accounts/page.tsx` - move to `primary` (fixes grey to black)
- [x] 2.4 `src/app/staff/(protected)/curricula/page.tsx` - move to `primary` (fixes grey to black)
- [x] 2.5 `src/app/staff/(protected)/training-codes/page.tsx` - move to `primary` (fixes grey to black)
- [x] 2.6 `src/app/staff/(protected)/mtu-catalog/page.tsx` - move to `primary` (fixes grey to black)
- [x] 2.7 `src/app/staff/(protected)/students/page.tsx` - swap markup to the primitive, keep the primary variant
- [x] 2.8 `src/app/staff/(protected)/classes/page.tsx` - swap markup to the primitive, keep the primary variant

## 3. Migrate dashboard hero actions

- [x] 3.1 `src/app/staff/(protected)/admin/page.tsx` - use the primitive with `primary` at the larger size
- [x] 3.2 `src/app/staff/(protected)/instructor/page.tsx` - use the primitive with `primary` at the larger size

## 4. Migrate detail pages to the `actions` node

- [x] 4.1 `sites/[id]`, `agencies/[id]`, `curricula/[id]`, `mtu-catalog/[id]`, `training-codes/[id]`, `students/[id]`, `accounts/[id]` pages - pass Back/status/toggle controls through `actions`
- [x] 4.2 `classes/[id]/page.tsx`, `classes/[id]/edit/page.tsx`, `classes/[id]/review/page.tsx`, `classes/[id]/sign-in-record/page.tsx` - pass Back/status/secondary controls through `actions`
- [x] 4.3 `classes/live-roster.tsx` - route the section header through the primitive, keeping the supporting action secondary

## 5. Migrate remaining headings

- [x] 5.1 `reporting/page.tsx` and `profile/page.tsx` - headings with no action
- [x] 5.2 `src/app/staff/(protected)/error.tsx` - heading with actions
- [x] 5.3 `students/new/page.tsx` - heading with a passive navigation link through `actions`

## 6. Verify

- [x] 6.1 Run lint and static type checking
- [x] 6.2 Confirm no `admin-heading` markup remains hand-written outside the primitive
- [x] 6.3 Confirm every create action (heading and empty state) renders the primary variant, and that layout is unchanged apart from the corrected variants

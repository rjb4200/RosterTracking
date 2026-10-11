## 1. Shared primitive

- [x] 1.1 Add `src/components/ui/empty-state.tsx`: a server component with an optional `icon`, a required `title`, an optional `description` (`ReactNode`), and an optional `action` node; token-based Tailwind styles and a `data-slot="empty-state"` hook matching `Badge`/`Table` conventions
- [x] 1.2 Remove the `.operational-empty` and `.public-class-empty` rules from `src/app/globals.css` once no page references them

## 2. Dashboard empty states

- [x] 2.1 Update `src/app/staff/(protected)/operational-class-dashboard.tsx` so `OperationalClassSection` renders the shared primitive and accepts an optional description and an optional action in place of the single `empty` string
- [x] 2.2 Update `src/app/staff/(protected)/instructor/page.tsx`: overdue is a reassurance with no action, today names `upcoming[0]` with its formatted date and time when there is no class today, and upcoming offers the create-class action
- [x] 2.3 Update `src/app/staff/(protected)/admin/page.tsx`: my-teaching, department-overdue, and department-oversight each explain their empty state as a reassurance with no action

## 3. Staff list empty states

- [x] 3.1 Update the reference catalog lists (`agencies`, `sites`, `training-codes`, `curricula`) to use the primitive and distinguish "no records yet" (create action) from "no search matches" (clear-search action), based on whether `q` is active
- [x] 3.2 Update `src/app/staff/(protected)/students/page.tsx` to distinguish no-students (new-student action) from no-search-matches (clear-search action)
- [x] 3.3 Update `src/app/staff/(protected)/accounts/page.tsx` to distinguish no-accounts (new-account action) from no-search-matches (clear-search action)
- [x] 3.4 Update `src/app/staff/(protected)/mtu-catalog/page.tsx` so each empty kind (equipment, supplies, transport) explains itself and offers the create-entry action, with a clear-search state when a search matches nothing
- [x] 3.5 Update the class list in `src/app/staff/(protected)/classes/page.tsx` to offer create-class when no class exists, clear-the-filters when active filters or search exclude every class, and a no-action reassurance for the empty finalized section

## 4. Public directory

- [x] 4.1 Update `src/app/page.tsx` so the empty directory explains that no class is open for sign-in and that classes appear when opened, with no staff action

## 5. Verification

- [x] 5.1 Add or extend end-to-end coverage for representative empty states: the instructor today section naming the next upcoming class, one list "no records yet" state, one list "no search matches" state, and the empty public directory
- [x] 5.2 Run `npm run check`, `npm run test`, and `npm run test:integration` and resolve any failures

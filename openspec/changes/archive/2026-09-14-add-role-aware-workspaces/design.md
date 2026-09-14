## Context

The staff shell currently filters one navigation menu from an effective permission set, while role codes are not returned by the current staff lookup. User roles are many-to-many, permissions are their active-role union, and several class/finalization rules deliberately inspect elevated role codes. See `proposal.md` for the requested workspace and account-management outcomes.

## Goals / Non-Goals

**Goals:**
- Present Instructor and Admin workspaces without changing authorization semantics.
- Keep current shared routes usable while introducing focused entry points.
- Make Administrator the sole account-management authority.
- Ensure role and account lifecycle changes take effect for existing sessions.

**Non-Goals:**
- Moving or removing shared class, reporting, or reference-data routes.
- Creating public account registration.
- Replacing domain-specific elevated-role checks with navigation decisions.
- Supporting multiple roles in the new account-creation form; existing multi-role assignments remain valid and use Admin workspace precedence.

## Decisions

### Load active role codes with each current-staff lookup
Extend the database-backed current staff object with deduplicated active role codes alongside permissions. Do not place role codes in the JWT: database resolution means role changes take effect without requiring a fresh login.

### Route `/staff` by workspace precedence
Use Administrator/Training Major as Admin-workspace precedence, then Instructor. The account-management form assigns exactly one role to a newly created account; retained legacy multi-role accounts remain authorized by their existing union and resolve to the Admin workspace when elevated.

### Add workspace entry routes and reuse shared screens
Add `/staff/instructor` and `/staff/admin` pages beneath the current protected route group. Each page is a role-aware dashboard and navigation entry, but links to existing shared screens rather than duplicating operations. This preserves bookmarks and minimizes migration risk.

### Manage accounts through a dedicated Administrator-only service
Implement account creation, role replacement, activation changes, and password reset as server-side service operations gated by `staff.manage` plus the Administrator role. Hash passwords with the established password helper, replace rather than accumulate UI-managed roles, increment session version after sensitive changes, and audit metadata only.

`staff.manage` alone is insufficient because the Training Major is intentionally excluded today but could receive other broad permissions later. The explicit Administrator-role check fulfills the policy without changing grants.

## Risks / Trade-offs

- [Legacy multi-role records exist] → Preserve their effective permission union and use elevated workspace precedence instead of dropping roles.
- [Role changes occur during a session] → Resolve roles from the database and invalidate sessions after administrator-driven lifecycle changes.
- [Shared navigation causes confusing context] → Clearly label the current workspace and provide focused workspace links while keeping shared URLs stable.
- [Admin alters own account] → Protect the final active Administrator from deactivation or role removal to avoid account-management lockout.

## Migration Plan

1. Deploy the role-aware lookup and workspace routes alongside existing shared routes.
2. Deploy Administrator-only account management and preserve the bootstrap command as recovery access.
3. Verify Administrator, Training Major, and Instructor routing with seeded test accounts and direct-route authorization checks.
4. Roll back by retaining shared routes and routing `/staff` to the existing generic page; account and role records remain compatible.

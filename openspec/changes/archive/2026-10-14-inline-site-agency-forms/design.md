## Context

During class setup the wizard offers "Add a new site" and "Add a new agency" that capture only a name (and hardcode `state="KY"` for sites). The inline actions already read every field the admin forms use, but the wizard never sends them, so the records are stored with blank details. The details are collection-only today; they will later be used to contact sites and email documents. Separately, `createAgency` rejects an active-name duplicate, while `createSite` has no unique constraint and silently creates a duplicate.

Existing pieces this design leans on:
- The reusable client form components `AgencyForm` and `SiteForm` (field markup + `useActionState`).
- The `Dialog` primitive already used by the wizard.
- `createAgency`/`createSite` services, which already accept the full field set.
- The agencies table's case/whitespace-insensitive unique index, which training sites lack.

## Goals / Non-Goals

**Goals:**
- Let staff capture a site's or agency's full details inline, without leaving the wizard.
- Prevent a second active record from being created for a name that already exists.
- Keep the name required and every other field optional.

**Non-Goals:**
- Using the details in reports, emails, or outreach (they remain collection-only).
- Changing the admin agency/site pages.
- Changing the archived/inactive revive behavior (it continues to overwrite with the supplied details).
- Backfilling existing incomplete records.

## Decisions

**D1 — Reuse the admin form components inside a dialog.** The inline "add" opens a `Dialog` rendering `AgencyForm` / `SiteForm`, wired to the inline create actions. Chosen over bespoke popup forms because the field markup, tag/subtype logic, and validation already live in those components. The components gain an optional `onCreated` callback so the wizard can add the returned record to its options and select it; the callback is additive and leaves the admin pages unchanged.

**D2 — An active-name match reuses the existing record.** `createAgency` and `createSite` return the existing active record unchanged when the (case/whitespace-insensitive) name matches, instead of erroring or inserting. Chosen over rejecting with a message because reuse is seamless and the wizard would otherwise have to locate and select the record anyway. Renaming to a duplicate is still rejected.

**D3 — Training sites gain a case/whitespace-insensitive unique name.** Add `uniqueIndex` on `lower(btrim(name))` to `training_sites`, matching `agencies`, so the database guarantees no active duplicate even if the service path is bypassed. The service-level reuse (D2) keeps this from surfacing as an error.

**D4 — Archived/inactive revive is unchanged.** Creating a name that matches an archived or inactive record still revives/reactivates it and overwrites its details, as today.

**D5 — The wizard receives agency tags.** The class-creation page loads the active agency tags and passes them to the wizard so the agency dialog can offer the service tags and Other subtype.

## Risks / Trade-offs

- [Existing duplicate site names would block the unique-index migration] → detect duplicates before applying and resolve them (deactivate/rename), or apply the index only after de-duplicating; verify against each environment first.
- [Reuse could hide an intended new record that shares a name] → names are treated as the site/agency identity, so a shared name means the same place; acceptable.
- [Adding `onCreated` to the shared form components could affect admin pages] → the prop is optional and defaults to no behavior.
- [A blank revive overwrites an archived record's details] → intended per D4; archived records are retired and their details are not in active use.
- [Loading tags adds a query to the wizard page] → minor; the query is small and already exists for the agencies page.

## Migration Plan

1. Resolve any existing duplicate active site names in each environment.
2. Add the unique index migration to `training_sites`.
3. Ship the service reuse and the popup UI.
4. Rollback: drop the unique index; the UI and service changes are inert without it.

## Open Questions

- Should the site dialog default its state field to `KY` (the admin form does)?
- Should the wizard keep a quick "type a name and add" shortcut alongside the dialog? Default: no — one path.

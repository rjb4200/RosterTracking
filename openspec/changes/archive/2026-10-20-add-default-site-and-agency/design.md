## Context

Training sites and agencies are reference records with an active/inactive state and an archived state. The class creation wizard currently defaults only the lead instructor; the training site and host agency start blank, and sites are merely sorted with recent ones first.

The department wants one default training site and one default host agency for new classes, set independently. The settings are global, not per instructor. Both records already have dedicated management pages and lifecycle actions, so the default belongs on the record rather than in a separate settings table.

## Goals / Non-Goals

**Goals:**

- Let an Administrator designate one default training site and one default host agency.
- Start new classes with those defaults selected, without removing the ability to change them.
- Keep the default flags visible in the Sites and Agencies lists.
- Prevent a default from being deactivated or archived until the flag is cleared.
- Keep the change small: no per-user configuration and no new settings surface.

**Non-Goals:**

- Per-instructor defaults or fallback to recent values.
- A single paired “class location” setting.
- Automatic selection when no default is configured.
- Changing class validation, reporting rules, or stored class facts.
- Showing the default checkbox inside the class wizard’s inline site/agency dialogs.

## Decisions

### Store the default on the reference record

Add `is_default` to `training_sites` and `agencies`, each with a partial unique index (`where is_default`). *Alternative considered:* two keys in `app_settings`. Rejected because the default is a property of the record, needs to appear in the lists and detail pages, and benefits from database uniqueness rather than convention.

### One default per table, enforced in the database

The partial unique index guarantees at most one default site and one default agency. A check constraint (`not is_default or is_active`) keeps a default active. The service transaction clears the previous default before setting the new one. *Alternative considered:* an application-only invariant. Rejected because two concurrent admin saves could otherwise produce two defaults.

### Administrator-only control on the standalone New and Edit forms

The checkbox appears on `/staff/sites/new`, `/staff/sites/[id]`, `/staff/agencies/new`, and `/staff/agencies/[id]`, and is hidden unless the actor is an Administrator. The server action re-checks the role before accepting the flag. The shared `SiteForm` and `AgencyForm` receive a `canSetDefault` prop so the inline class-wizard dialogs can render the forms without the checkbox. *Alternative considered:* a separate settings form on the Agencies page. Rejected because the user wants the site default in the Sites menu and the agency default in the Agencies menu.

### Inline warning before saving

The form knows the current default’s name and whether this record is the default. When the checkbox state would replace another default, the form shows an inline warning naming the current default. When unchecking the current default, it warns that new classes will have no default. The warning is advisory; the Save button remains the confirmation step. *Alternative considered:* a second save-to-confirm step. Rejected as heavier for a low-frequency admin change.

### Clearing the default is allowed

Unchecking the current default leaves no default, and the wizard starts that field blank. This matches the explicit “no fallback” decision. The alternative of always requiring a default was rejected because the department may not want to force one.

### Deactivate and archive are blocked while default

The lifecycle services check `is_default` in the same transaction and refuse the change with a clear message. The detail page hides the Deactivate and Archive actions while the record is the default and explains why. The check constraint is the final backstop. *Alternative considered:* automatically clearing the default on deactivate. Rejected because it would silently change which record new classes use.

### Preselect from the existing class-form options

`listClassFormOptions` already reads the active site and agency catalogs. Add the default IDs to its result and initialize the wizard’s `trainingSiteId` and `hostAgencyId` from them. The wizard continues to use the same editable controls. *Alternative considered:* a separate defaults query from the client. Rejected because the server already assembles the wizard’s options.

### Audit the default changes

Record `site.default.changed` and `agency.default.changed` with the previous and new default. The existing reference update audit remains for the other fields. This makes a global change attributable.

## Risks / Trade-offs

- **A default can be replaced by accident** → Inline warning naming the current default; the actor must still save.
- **Concurrent admin saves** → The partial unique index rejects a second default; the losing request surfaces a retryable error.
- **An inactive record could carry the flag** → The check constraint and the service validation prevent it; the wizard also only reads active catalogs.
- **The shared forms appear in inline dialogs** → Pass `canSetDefault={false}` there so the class wizard stays focused.
- **Clearing the default leaves the wizard blank** → Intended. The admin warning makes the consequence explicit.

## Migration Plan

1. Add `is_default` (boolean, default false, not null) to `training_sites` and `agencies`.
2. Add the partial unique indexes and the active-state check constraints.
3. Deploy the reference forms, lifecycle guards, list badges, and wizard preselection.
4. No backfill: no record becomes the default until an Administrator sets one.
5. Rollback: drop the columns and indexes; existing site and agency data is unaffected.

## Open Questions

None.

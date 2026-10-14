## Why

During class setup, staff can add a training site or host agency inline, but only the name is captured, so the catalog accumulates records with no address or contact details. The department will later use those details to contact sites and email documents, so they must be capturable at creation. Re-adding a site whose name matches an existing active site also currently creates a duplicate.

## What Changes

- The wizard's "Add a new site" and "Add a new agency" open a popup form with the full field set instead of a single name box. The name is required; every other field stays optional, but staff are given the opportunity to fill the details.
- Creating a site or agency whose name matches an existing **active** record reuses that record (it is selected, and nothing is overwritten or duplicated). Creating one whose name matches an **archived or inactive** record continues to revive/reactivate it.
- Training sites gain a case- and whitespace-insensitive unique name, matching agencies, so an active duplicate cannot be created.
- The class-creation page loads the agency service tags so the agency popup can offer them.

## Capabilities

### New Capabilities
- `site-management`: the training-site record — its fields, its unique name, and how creating a site with an existing name resolves (reuse an active site, revive an inactive one).

### Modified Capabilities
- `agency-management`: adding an agency inline during class setup opens a form that captures the agency's details, and a name matching an active agency reuses that agency instead of failing.
- `class-creation-wizard`: the inline "add site" and "add agency" affordances become popup forms that capture the destination's details and then select the resulting record.

## Impact

- `src/app/staff/(protected)/classes/class-creation-wizard.tsx`: replace the inline name inputs with popup forms and select the created/reused record.
- `src/app/staff/(protected)/classes/actions.ts`: the inline site/agency actions return the existing active record on a name match.
- `src/modules/reference/services.ts`: `createSite` (active-name reuse) and `createAgency` (reuse instead of duplicate error).
- `src/server/db/schema/reference.ts` + a migration: unique index on `training_sites` lower(name).
- `src/app/staff/(protected)/classes/new/page.tsx`: pass agency tags into the wizard.
- Specs: `site-management` (new), `agency-management` and `class-creation-wizard` (modified).

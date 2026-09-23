## Why

The wizard collects the class and *then* asks where it is reported, so it cannot ask destination-specific questions — the Fire roster needs subject details and KBEMS needs course details that only make sense once the destination is known. FEMA is no longer reported, and the grant-funded Mobile Training Unit must be accounted for, but the wizard has nowhere to capture its use.

## What Changes

- Make **Destinations the first step**: a multi-select of **Fire**, **KBEMS**, and **MTU**. **FEMA is removed.**
- Make the wizard **step-driven by destination**: checking a destination adds its step; clearing it removes the step. Common class-and-schedule and review steps follow.
- Add a **KBEMS step** that captures the course description/objectives used on the KBEMS-E16.
- Add an **MTU step** that captures equipment used, mileage, and used supplies as free text (usage tracking; no output document yet).
- **BREAKING (data)**: remove FEMA from the reporting systems, the reporting queue, and the credential seed; add MTU as a destination.
- Keep MTU usage with the class and preserve it in the finalization revision so a future report can read it.

## Capabilities

### New Capabilities
- `mtu-usage-tracking`: capture and preserve Mobile Training Unit usage (equipment, mileage, supplies) for a class.

### Modified Capabilities
- `class-creation-wizard`: Destinations step first; destination-driven steps; KBEMS and MTU steps; FEMA removed.
- `reporting-requirements`: seeded reporting systems become Fire, KBEMS, and MTU; MTU requires no student credential or field.
- `finalization-reporting`: independent destination statuses cover Fire, KBEMS, and MTU instead of Fire, KBEMS, and FEMA.

## Impact

- **Schema**: `reporting_systems` seed drops FEMA and adds MTU; new `mtu_usage` table (class id, equipment used, mileage, supplies); `finalization_revisions` snapshot gains MTU usage facts.
- **Modules**: `class-creation-wizard.tsx` (destinations-first, dynamic steps), `classes/services.ts` (persist MTU usage and destination selections), `reference-seed.ts` (system set), `finalization.ts` (snapshot MTU usage), reporting queue destination list.
- **Data migration**: deactivate the FEMA reporting system (do not delete — existing revisions reference it) and seed MTU.
- **Testing**: unit, integration, and browser coverage for destination-driven steps, MTU capture, FEMA removal, and queue destinations.
- **Dependency**: the Fire step's subject fields are defined by `complete-fire-roster-fields`; the KBEMS course type/number fields are defined by `add-ems-completion-certificate`.

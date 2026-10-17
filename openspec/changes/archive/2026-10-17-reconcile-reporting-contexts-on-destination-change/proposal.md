## Why

Editing a class's reporting destinations after students have signed in leaves each attendance's reporting context frozen at the destination set that was active at sign-in. When a destination is later added, finalization fails with "Active attendance is missing required reporting context" because the roster validation compares the attendance's context count against the class's now-larger resolved requirement set. The added destination's outputs can then never be produced.

A related gap compounds it: a class that selects only MTU has no destination that produces completion certificates, so an operator who expects certificates gets none, and the mistake is only discovered after finalization. Production hit both at once on the MTU-only class "Airway Management" — it produced no certificates, and once KBEMS was added after sign-in it could no longer be re-finalized.

## What Changes

- When a class's selected reporting systems change, reconcile every active attendance's reporting context with the class's currently resolved requirement sets: create contexts for newly selected systems and remove contexts for deselected systems.
- Compute a newly created context's retained reporting inclusion from the attendance's captured snapshots, using the same inclusion rules as sign-in and credential correction, without fabricating any credential or student-field value.
- Reconcile attendance reporting context whenever an open class's reporting state is resolved — on save, when readiness is computed, and at finalization — so a class whose destinations changed after sign-in shows ready, finalizes, and issues its certificates instead of being withheld or blocked.
- Keep finalization's existing missing-reporting-context validation as a defensive backstop.
- Require that selecting MTU also selects Fire or KBEMS, on class creation and on edit, so no MTU-only class can be created or saved. **BREAKING** — retires the MTU-only class capability, including the class-name-entered-when-neither-selected path.
- Remediate the already-affected production class so its completion certificates are delivered.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `attendance-sign-in`: the retained attendance reporting context is reconciled when the class's selected reporting systems change, not written only at sign-in.
- `class-management`: changing a class's reporting systems reconciles attendance reporting context; selecting MTU requires Fire or KBEMS; the class-name derivation drops the no-longer-reachable entered-name path.
- `class-creation-wizard`: the Destinations step requires Fire or KBEMS alongside MTU, and the class-name rule no longer covers an MTU-only class.
- `guided-roster-finalization`: finalization reconciles reporting context before locking, so a destination change made after sign-in does not block the final roster or its certificates.

## Impact

- `src/modules/classes/services.ts` — `updateClass`/`replaceReportingSystems` (reconciliation) and `createOpenClass`/`updateClass` (the MTU pairing guard).
- `src/modules/credential-correction/service.ts` — the inclusion-derivation logic to share.
- `src/modules/instructor-roster/services.ts` — the finalization backstop and the readiness check that must stay consistent with reconciliation.
- `src/modules/classes/finalization.ts` — `finalizeClass` reconciles before validating the roster.
- The class-creation wizard's Destinations step and the integration/browser suites that create MTU-only classes.
- No database schema change, no migration.

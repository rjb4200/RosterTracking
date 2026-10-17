## Context

An attendance row's reporting context lives in `attendance_reporting_contexts` — one row per `(attendance, requirement set)` — and is written exactly once, during student sign-in (`insertReportingSnapshots` in `src/modules/student-sign-in/attendance.ts`), from the requirement sets resolved for the class's destinations *at that moment*.

A class's destinations are editable while the class is open, and again after a finalized class is reopened (`updateClass` → `replaceReportingSystems`). That edit updates `class_reporting_systems` but does not touch `attendance_reporting_contexts`.

Two things then break. `validateRosterCompletion` (`src/modules/instructor-roster/services.ts`) refuses finalization:

```ts
if (contexts.length !== requirements.sets.length)
  throw new Error("Active attendance is missing required reporting context.");
```

And `getRosterReadiness` reports the class as not ready, so the review screen withholds the finalize action — the instructor cannot even attempt the lock. Production hit both on class "Airway Management": `resolveClassRequirements` resolves two sets (KBEMS + MTU) while each attendance still holds one row (MTU), so `1 !== 2`.

Two constraints shape the design:
- Reporting inclusion must not be fabricated. The `attendance-sign-in` spec requires that later profile edits never change an attendance's reporting facts, and a credential is included only when the attendee actually supplied it.
- Certificates are an EMS artifact. Fire classes produce individual training notices and MTU records resource usage only; only KBEMS produces completion certificates. So an MTU-only class has no cert-capable destination by construction.

## Goals / Non-Goals

**Goals:**
- Keep every active attendance's reporting context consistent with the class's currently selected reporting systems.
- Guarantee that a destination changed after sign-in neither withholds the finalize action nor blocks finalization, so re-finalizing a class issues its certificates.
- Prevent MTU-only classes so a class always carries a Fire or KBEMS destination.
- Deliver the affected class's certificates.
- Derive any added context's inclusion only from facts the attendance already captured.
- Repair the drift seen in production without a schema change.

**Non-Goals:**
- Backfilling credential or student-field snapshots an attendee never supplied.
- Guaranteeing certificates for every class (Fire-only and Fire+MTU classes still produce none).
- Changing how sign-in, credential correction, or inclusion rules resolve.
- Reconciling finalized revisions, which keep their own immutable encrypted snapshot.

## Decisions

### Reconcile on change, when readiness is resolved, and at finalization
The context is maintained in three places, so no path leaves it stale:

- **On change** — `updateClass` reconciles after it replaces `class_reporting_systems`, keeping the roster, reports, and readiness correct from the moment a destination is saved.
- **When readiness is resolved** — `getRosterReadiness` reconciles inside its transaction before it compares contexts to the resolved sets, so a class drifted before this shipped presents the finalize action instead of hiding it.
- **At finalization** — `finalizeClass` reconciles every active attendance before it calls `validateRosterCompletion`, so the lock cannot fail on a stale context.

Alternatives considered:
- **Reconcile only at edit time.** Rejected: a class drifted before this change, or by any out-of-band change, would still show not-ready and fail its next finalization.
- **Reconcile only at finalization.** Rejected: readiness withholds the finalize action, so the instructor could never reach finalization.
- **Make the check set-aware and skip missing contexts.** Rejected: a destination would be reported with no context at all — no inclusion resolution, no snapshots — silently producing incomplete output instead of reconciling the derived fact.
- **Relax readiness to ignore the gap, only reconciling at finalization.** Rejected: readiness should reflect reality; reconciling the derived context is the fix, not hiding it.

Reconciling while resolving readiness is an idempotent write on a staff-only, authorized read path inside a transaction — accepted as lazy repair of derived state.

### Share the inclusion derivation, do not duplicate it
A newly inserted context's `included` value is derived from the attendance's existing credential and student-field snapshots plus the set's active inclusion rule — the same computation as `recomputeAttendanceInclusion` in `src/modules/credential-correction/service.ts`. That logic should be shared so sign-in, correction, reconciliation, and finalization cannot diverge. A credential-free rule (KBEMS — includes every attendee) resolves to included; a rule that needs an attribute the attendee never supplied (Fire FFN) resolves to excluded. Neither invents data.

### Require an accreditation destination with MTU
Selecting MTU SHALL require Fire or KBEMS. Enforced at creation (wizard validation and `createOpenClass`) and at edit (`updateClass`), so a reopened class cannot be saved back into an MTU-only state.

Alternatives considered:
- **Keep MTU-only and require an explicit "no certificates" acknowledgement.** Rejected by product in favor of a hard rule that removes the class type.
- **Require KBEMS specifically.** Rejected by product: Fire-accredited MTU classes are legitimate, and Fire is an acceptable second destination (see the accepted trade-off below).
- **Make MTU generate certificates.** Rejected: it genericizes an EMS continuing-education certificate, requires MTU-only classes to collect EMS course details they never collected, and needs the finalization certificate gate decoupled from KBEMS.

Accepted trade-off: an MTU + Fire class still produces no certificates, because Fire yields training notices, not certificates. The rule removes MTU-only classes and forces an explicit destination choice; it does not guarantee a certificate for a Fire+MTU class.

### Reconcile only active attendance
Removed attendance is already excluded from `validateRosterCompletion` and from destination output; its contexts are left untouched as historical record.

### Idempotent
Reconciliation keys on the class's resolved sets and the attendance's existing rows, so running it on every save, readiness resolution, and finalization is a no-op when contexts already match.

## Risks / Trade-offs

- **An added system's required attribute was never collected for existing attendees.** They resolve as excluded from that destination's output (e.g. Fire without an FFN). This matches sign-in behavior; the credential-correction path can supply the value later and re-derive inclusion.
- **MTU + Fire still yields no certificates.** Accepted product trade-off. If it resurfaces, a KBEMS-specific rule or an explicit acknowledgement is the follow-up.
- **Retiring MTU-only removes a documented, tested capability.** The wizard, the class-name derivation, and the integration/browser suites that create MTU-only classes must change together; the class-management naming clause that persists a class name "when neither is selected" becomes unreachable.
- **A class drifted before this change needs no manual step.** Readiness and finalization both reconcile, so after deployment the instructed re-finalization of the production class issues its certificates.
- **A readiness read now writes.** Bounded to idempotent reconciliation of derived rows inside the existing staff-only transaction; no user-visible effect when contexts already match.
- **Deleting contexts when a destination is removed.** Loses the previously resolved inclusion for that system on live attendance. Acceptable because the class has not been finalized for the new destination set; a prior finalized revision retains its own snapshot.

## Migration Plan

No schema change and no migration.

- After this change is applied, the affected class needs no manual data work: opening its review screen reconciles readiness, and the lead instructor re-finalizes to issue the certificates.
- If certificates are needed before deployment, backfill the class's missing KBEMS reporting-context rows (inclusion true, per the KBEMS rule) and re-finalize.
- The MTU guard is forward-only: it does not retroactively reject existing MTU-only classes until they are edited. Any such class should be brought to Fire or KBEMS.

## Open Questions

- Confirm that removing a destination while a class is open should delete the live context rows (chosen) rather than retain them as inert history.

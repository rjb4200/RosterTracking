## Context

Class delivery is currently a single value on `training_classes` (`classroom`, `hands_on`, `online`, or `hybrid`), and every session's KFS-1A `method` is derived from it and overwritten whenever it changes. `hybrid` exists only as a shortcut for Classroom + Online. The schema and validation allow only `cr`, `ho`, `ol`, and `cr,ol`, even though the KFS-1A form treats CR, HO, and OL as independent checkboxes and `parseComponentMethod` already reads a comma-set.

Site selection is coupled to delivery: `validateDeliverySite` requires a site unless the class is online, the schema mirrors that rule, the wizard hides the site control for online, while `ClassForm` still allows a site. The spec says online classes permit no site. Session credited hours are entered as a decimal number (`step="0.25"`) even though the server already rejects a duration that is not a whole quarter hour, and several displays still print decimals.

This change makes delivery and method explicit sets, keeps delivery as a seed for sessions, requires a site for every class, and moves session-hour entry to hours and minutes.

## Goals / Non-Goals

**Goals:**

- Any non-empty combination of Classroom, Hands-On, and Online at the class level.
- Any non-empty combination of CR, HO, and OL per session, independently editable, with HO as an ordinary choice.
- Class delivery remains a default that seeds new sessions without erasing divergent sessions.
- A training site is required for every class, independent of delivery.
- Session hours are entered in 15-minute increments and displayed in hours and minutes.
- A safe, forward-only migration with legacy `hybrid` normalization.

**Non-Goals:**

- Per-session training sites or a move of `training_site_id` off the class.
- Changes to reporting-system inclusion, MTU, finalization, or readiness rules.
- Server-side quarter-hour enforcement for roster credit adjustment (still interface-only).
- The in-flight `area-action-bar` workspace/action-bar redesign.

## Decisions

**1. Store both sets as canonical comma-separated text.**
Delivery is stored in the order `classroom,hands_on,online`; method in the order `cr,ho,ol`. Helpers parse, normalize, and format the sets for UI, mapping, and display. This matches the existing `method` convention, keeps finalized snapshots as strings, and avoids a new table. *Alternative:* `text[]` columns have cleaner subset checks but change the read type and snapshot/PDF handling for little present benefit. A join table is unnecessary for three fixed values.

**2. Class delivery is a seed; session method is independent.**
A new session inherits the union of codes mapped from the class delivery set. When the class delivery changes, only sessions whose method still equals the previous default are updated; sessions that already differ are preserved. This keeps HO overrides without adding a `customized` column. *Alternative:* overwrite every session (destroys HO overrides) or add a boolean flag (extra state to maintain).

**3. Every non-empty subset is valid; `hybrid` becomes a legacy alias.**
Mapping is a 1:1 set union: classroom→CR, hands_on→HO, online→OL. `hybrid` is normalized to `classroom,online` on read and backfilled in the migration. The UI presents independent checkboxes rather than a multi-select list. *Alternative:* keep `hybrid` as a shortcut, which becomes ambiguous once arbitrary combinations are allowed.

**4. A training site is required for every class.**
The delivery-based site rule is removed: `validateDeliverySite` and `classes_site_required` go away, and `training_site_id` becomes `NOT NULL`. An online class uses a normal site record named "Online" (or "Virtual"). Existing null-site classes are backfilled to a site named "Online", found case-insensitively or created. *Alternative:* keep the delivery-based rule, which becomes incoherent when sessions diverge and contradicts the existing `ClassForm` behavior.

**5. One hours control, reused.**
Session credited hours use the same hours/minutes select pattern as participant credit: hours select plus `00/15/30/45`, with the decimal submitted in a hidden field. The creation wizard's scheduled duration uses the same control. *Alternative:* a single duration menu is a long list; a `time` input represents a clock time, not a duration.

**6. Class-level output uses the union of session methods.**
Editors label the class value "Default delivery". Session rows show each session's actual set. The class list and sign-in PDF use the union of session methods, so a divergent HO session is not hidden behind an online or classroom default. Legacy `hybrid` renders as "Classroom + Online". *Alternative:* show only the stored default, which under-reports what actually happened.

## Risks / Trade-offs

- **Class default drifts from session methods** → the editor labels it a default, class-level output uses the union, and a default change preserves divergent sessions.
- **Comma-set drift (order, duplicates, unknown tokens)** → canonical normalization in one helper, DB checks limited to allowed tokens, and unit tests for parse/format.
- **Site backfill collision** → prefer an existing active site named "Online" (case-insensitive); create one only when absent. If only an archived "Online" exists, create a distinct active record rather than silently reviving an archived one.
- **Finalized snapshots hold `hybrid`** → normalize on read; do not rewrite finalized history.
- **Tests and specs assume single values** → update unit, integration, and browser coverage as part of the change.
- **Hours validation asymmetry** → session duration is already enforced server-side; roster credit adjustment remains interface-only by earlier decision.
- **`area-action-bar` overlap** → it edits `component-form.tsx` and the schedule area; coordinate or serialize the two changes.

## Migration Plan

1. Add set parse/format/normalize helpers and update read paths so legacy `hybrid` renders correctly before any write path changes.
2. Apply one forward-only migration:
   - relax `classes_delivery_method` to allow every non-empty subset;
   - backfill `hybrid` to `classroom,online`;
   - relax `class_components_method` to allow every non-empty subset;
   - ensure a site named "Online" exists when any class has a null site, and assign null-site classes to it;
   - set `training_site_id` `NOT NULL`;
   - drop `classes_site_required`.
3. Deploy the application changes: server accepts sets, UI uses checkbox groups, session hours use hours/minutes.
4. Run unit, integration, and browser coverage; take a Neon snapshot before the production migration.

Rollback is forward-only. Reverting the application while the schema remains is safe for reads; an older application that creates a class without a site would be rejected by `NOT NULL`, so a rollback of the schema requires a compensating migration or a snapshot restore.

## Open Questions

- None blocking. Assumptions: the backfill site is named "Online"; class-level output uses the union of session methods; a session must have at least one method.

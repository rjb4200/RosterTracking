# Design

## Context

See `proposal.md` for motivation and `specs/` for required behavior.

Current constraints that shape the approach:

- Fire categories live on `class_components.training_code_id`; the EMS category lives on `classes.ems_category_id`. A dual Fire + KBEMS class can have both.
- Certificates are generated only from an encrypted, immutable finalization snapshot (`FinalizationSnapshot`), not from live rows, and completion certificates are currently KBEMS-only.
- The certificate PDF and its email both derive from `snapshot.class.courseName`, so one computed label can feed both without a new template.
- The email outbox keys deliveries by template, source, and recipient; `skipped` handles unchanged content via a content fingerprint.
- MTU usage is operational and is intentionally not part of the signed snapshot; instructor facts (`name`, `ffn`, `level`) already are.

## Goals / Non-Goals

**Goals:**

- Capture an external certificate issuer per category, an internal-certificate decision per class, and an MTU-instructor designation per staff account.
- Freeze certificate-relevant facts at finalization so later edits cannot change a finalized document.
- Reuse the existing certificate template and email shell; add only a label and one new notice template.
- Keep the MTU usage summary report unchanged in this change.

**Non-Goals:**

- Any MTU hourly rate, reimbursement calculation, or new report column.
- A separate "hours completed" PDF template or new certificate dispositions.
- External-certificate numbers or per-student external tracking.

## Decisions

### Store the issuer as constrained text, not an enum type

Add `training_codes.external_cert_issuer text null` with a check constraint limited to `aha`, `naemt`, or `other`. This matches the existing `kind` and status text columns, avoids a Postgres enum migration, and lets the shared constants module define the option list once.

### Resolve the class's issuer at finalization

A class's applicable issuer is the selected EMS category's issuer when present, otherwise the first selected Fire subject's issuer. The resolved value is written to the snapshot, so a class with both subjects has a deterministic answer and later category edits cannot rewrite it.

### Freeze certificate facts in the finalization snapshot

Add to `FinalizationSnapshot`:

```
class.issueInternalCert   boolean
class.externalCertIssuer  'aha' | 'naemt' | 'other' | null
instructors[].mtuInstructor boolean
```

Absent values on legacy revisions decode as `issueInternalCert: true`, `externalCertIssuer: null`, and `mtuInstructor: false`, preserving today's behavior. `mtuInstructor` is groundwork for the deferred hours report; no report reads it yet.

### One label helper feeds certificate and email

Add one module-level helper alongside the certificate service:

```
isHoursRecord(snapshot, participant) =
     snapshot.class.externalCertIssuer != null
  || Number(participant.creditedHours || 0) < Number(certificateClassHours(snapshot) || 0)

HOURS_RECORD_SUFFIX = " — Hours Completed (Not Official Certification)"
```

Use it in three places:

1. `fillCertificate` course field and the signature-line title (`snapshot.class.courseName` + suffix).
2. `certificateContentFingerprint` — include the label so a label change is not suppressed as "unchanged."
3. `renderCertificateEmail` — pass a flag so the subject and heading say "Hours Record" rather than "Certificate of Completion."

Reusing `snapshot.class.courseName` means no PDF layout or template change. Long combined titles still shrink via the existing `setFittedText` and signature-line fallback.

### Gate the automatic batch, keep individual sends

The finalization enqueue path sends the certificate batch only when `snapshot.class.issueInternalCert` is true. Individual sending stays available: the existing resend path already creates a delivery when none exists, and the review screen now shows a "Not sent" participant with a Send control even when the batch is off.

### Completion notice is its own template

Add a versioned template beside the certificate email, e.g. `COMPLETION_NOTICE_EMAIL_TEMPLATE` / `...-001`, rendered through the same brand shell, with no attachment. It is enqueued at finalization when `externalCertIssuer != null` and `issueInternalCert` is false, keyed to the finalization revision and attendance like the certificate delivery. A distinct template keeps its delivery and duplicate-suppression semantics independent of certificates.

### MTU instructor is an account-level designation

Add `users.mtu_instructor boolean not null default false`. It is set only through staff account create/update, audited like other account fields, and does not touch roles or permissions. The class instructor option query selects the flag and the assignment form and instructor list render the MTU marker. No hourly rate is stored.

### Migration

One forward-only migration:

```
alter table training_codes add column external_cert_issuer text;
alter table classes        add column issue_internal_cert boolean not null default true;
alter table users          add column mtu_instructor     boolean not null default false;
-- check constraint for training_codes.external_cert_issuer
```

The migration is idempotent (`IF NOT EXISTS` and a guarded constraint) so it can be applied to a development database that already received the columns during iteration. No data backfill is required; defaults preserve existing behavior.

## Risks / Trade-offs

- **Live vs. frozen values** → The class flag, issuer, and instructor designation used by certificates come from the frozen snapshot, not current rows.
- **Long labeled course titles** → The existing fitted-text path shrinks the value; if it still cannot fit, the signature line falls back to the class name, as today.
- **Unchanged-email suppression** → The hours-record label is in the content fingerprint, so a newly labeled document is not skipped.
- **Fire-only issuer resolution** → Only the first Fire subject's issuer is used; dual-subject classes have one deterministic issuer.
- **Manual send without a prior delivery** → The resend path creates a delivery row when none exists, so flag-off classes can still send an individual certificate.
- **Completion notice to undeliverable participants** → Follow the existing undeliverable behavior: record the exception, do not block finalization.

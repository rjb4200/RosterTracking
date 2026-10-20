import type { ClassAuditLogEntry } from "./service";

export type AuditCategory =
  | "setup"
  | "attendance"
  | "finalization"
  | "reporting"
  | "other";

export const AUDIT_CATEGORY_ORDER: AuditCategory[] = [
  "setup",
  "attendance",
  "finalization",
  "reporting",
  "other",
];

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  setup: "Class setup",
  attendance: "Sign-in & attendance",
  finalization: "Finalization",
  reporting: "Reporting & outputs",
  other: "Other",
};

const ACTION_CATEGORIES: Record<string, AuditCategory> = {
  "class.created": "setup",
  "class.updated": "setup",
  "class.reporting_systems.changed": "setup",
  "class.component.saved": "setup",
  "class.instructor.assigned": "setup",
  "class.status.changed": "setup",
  "class.sign_in.rotated": "setup",
  "attendance.public_sign_in": "attendance",
  "attendance.manual_added": "attendance",
  "attendance.removed": "attendance",
  "attendance.credit_adjusted": "attendance",
  "student.created_from_sign_in": "attendance",
  "student.profile.completed_from_sign_in": "attendance",
  "student.credential.added_from_sign_in": "attendance",
  "student.membership.added_from_sign_in": "attendance",
  "class.finalized": "finalization",
  "class.reopened": "finalization",
  "class.attestation.signed": "finalization",
  "class.attestation.voided": "finalization",
  "reporting.destination.updated": "reporting",
  "official_roster.generated": "reporting",
  "official_roster.email.sent": "reporting",
  "completion_certificate.generated": "reporting",
};

export function auditCategory(action: string): AuditCategory {
  return ACTION_CATEGORIES[action] ?? "other";
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function status(value: unknown): string {
  return text(value) ?? "draft";
}

function humanize(action: string): string {
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

const DESCRIBERS: Record<string, (entry: ClassAuditLogEntry) => string> = {
  "class.created": (e) => {
    const name = text(e.details.name);
    return name ? `Class created: ${name}` : "Class created";
  },
  "class.updated": (e) => {
    const name = text(e.details.name);
    return name ? `Class details updated: ${name}` : "Class details updated";
  },
  "class.reporting_systems.changed": () => "Reporting systems changed",
  "class.component.saved": () => "Session saved",
  "class.instructor.assigned": (e) =>
    e.details.isLead ? "Lead instructor assigned" : "Instructor assigned",
  "class.status.changed": (e) =>
    `Status changed from ${status(e.details.from)} to ${status(e.details.to)}`,
  "class.sign_in.rotated": () => "Sign-in link rotated",
  "attendance.public_sign_in": (e) => {
    const kind = text(e.details.participantKind) ?? "participant";
    const method = text(e.details.signInMethod);
    return method
      ? `Public sign-in by ${kind} (${method})`
      : `Public sign-in by ${kind}`;
  },
  "attendance.manual_added": (e) => {
    const kind = text(e.details.participantKind);
    return kind
      ? `Attendance added manually (${kind})`
      : "Attendance added manually";
  },
  "attendance.removed": (e) => {
    const reason = text(e.details.reason);
    return reason ? `Attendance removed: ${reason}` : "Attendance removed";
  },
  "attendance.credit_adjusted": (e) => {
    const hours = text(e.details.creditedHours);
    return hours
      ? `Credited hours adjusted to ${hours}`
      : "Credited hours adjusted";
  },
  "student.created_from_sign_in": () => "New student record created at sign-in",
  "student.profile.completed_from_sign_in": (e) => {
    const fields = Array.isArray(e.details.fields)
      ? e.details.fields.length
      : 0;
    return fields
      ? `Student profile completed at sign-in (${fields} fields)`
      : "Student profile completed at sign-in";
  },
  "student.credential.added_from_sign_in": () =>
    "Student credential added at sign-in",
  "student.membership.added_from_sign_in": () =>
    "Student agency membership added at sign-in",
  "class.finalized": (e) => {
    const revision = e.revisionNumber ?? text(e.details.revisionNumber);
    return revision
      ? `Class finalized (revision ${revision})`
      : "Class finalized";
  },
  "class.reopened": (e) => {
    const reason = text(e.details.reason);
    return reason ? `Class reopened: ${reason}` : "Class reopened";
  },
  "class.attestation.signed": (e) => {
    const scope = text(e.details.scope);
    const label =
      scope === "fire"
        ? "Fire roster signed"
        : scope === "roster"
          ? "Roster signed"
          : "Document signed";
    const revision = e.revisionNumber ?? text(e.details.revisionNumber);
    return revision ? `${label} (revision ${revision})` : label;
  },
  "class.attestation.voided": (e) => {
    const scope = text(e.details.scope);
    const label =
      scope === "fire"
        ? "Fire roster signature voided"
        : "Document signature voided";
    return `${label} by reopening`;
  },
  "reporting.destination.updated": (e) => {
    const from = status(e.details.from);
    const to = status(e.details.to);
    return `Reporting destination updated from ${from} to ${to}`;
  },
  "official_roster.generated": (e) => {
    const form = text(e.details.formType);
    return form
      ? `${form.toUpperCase()} roster generated`
      : "Official roster generated";
  },
  "official_roster.email.sent": (e) => {
    const form = text(e.details.formType);
    const recipient = text(e.details.recipient);
    const label = form ? `${form.toUpperCase()} roster` : "Official roster";
    return recipient ? `${label} emailed to ${recipient}` : `${label} emailed`;
  },
  "completion_certificate.generated": (e) => {
    const count = text(e.details.participantCount);
    return count
      ? `Completion certificates generated (${count} participants)`
      : "Completion certificates generated";
  },
};

export function describeAuditEntry(entry: ClassAuditLogEntry): string {
  return DESCRIBERS[entry.action]?.(entry) ?? humanize(entry.action);
}

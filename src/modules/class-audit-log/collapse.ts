/**
 * The fields needed to collapse repeated official-output generation rows. The
 * caller passes the full audit row; only these fields are read.
 */
export interface CollapsibleAuditRow {
  action: string;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  details: unknown;
}

/**
 * Official outputs are generated on every view, so the same actor can produce
 * many identical generation rows for one revision. Collapse those to a single
 * row per actor so the log records who produced each output rather than how
 * many times it was opened. Official rosters key on actor, revision, and form;
 * completion certificates key on actor and revision. Email deliveries are kept
 * per send because each recipient is a distinct event.
 *
 * Rows are expected in chronological order; the earliest occurrence of each key
 * survives.
 */
export function collapseRepeatedGeneration<T extends CollapsibleAuditRow>(
  rows: T[],
): T[] {
  const seenRosters = new Set<string>();
  const seenCertificates = new Set<string>();
  return rows.filter((row) => {
    const actor = row.actorUserId ?? row.actorName ?? "";
    if (row.action === "official_roster.generated") {
      const form = (row.details as { formType?: unknown } | null)?.formType;
      const key = `${row.entityId ?? ""}|${actor}|${
        typeof form === "string" ? form : ""
      }`;
      if (seenRosters.has(key)) return false;
      seenRosters.add(key);
    } else if (row.action === "completion_certificate.generated") {
      const key = `${row.entityId ?? ""}|${actor}`;
      if (seenCertificates.has(key)) return false;
      seenCertificates.add(key);
    }
    return true;
  });
}

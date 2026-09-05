import { Badge } from "@/components/ui/badge";
import { listReportingQueue } from "@/modules/classes/finalization";
import { listReportingRequirements } from "@/modules/reference/requirements";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { updateReportingDestinationAction } from "./actions";
import { ReportingDestinationControl } from "./reporting-destination-control";

export const dynamic = "force-dynamic";

export default async function ReportingPage() {
  const actor = await requirePagePermission(PERMISSIONS.REPORTING_MANAGE);
  const db = getDatabase();
  const [rows, pending, corrections] = await Promise.all([
    listReportingRequirements(db),
    listReportingQueue(db, actor, "pending"),
    listReportingQueue(db, actor, "needs_correction"),
  ]);

  const bySystem = new Map<
    string,
    { name: string; requirements: string[]; version: number }
  >();
  for (const row of rows) {
    const entry = bySystem.get(row.systemCode) ?? {
      name: row.systemName,
      requirements: [],
      version: row.version,
    };
    if (row.kind === "credential" && row.credentialName) {
      entry.requirements.push(row.credentialName);
    } else if (row.kind === "student_field" && row.studentField) {
      entry.requirements.push(`Field: ${row.studentField}`);
    }
    bySystem.set(row.systemCode, entry);
  }

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1 className="staff-title">Reporting requirements</h1>
        </div>
      </div>

      <ul className="member-list">
        {[...bySystem.entries()].map(([code, system]) => (
          <li key={code} className="member-row">
            <span>{system.name}</span>
            <Badge variant="outline">Version {system.version}</Badge>
            <span className="text-muted-foreground">
              {system.requirements.length > 0
                ? system.requirements.join(", ")
                : "No requirements"}
            </span>
          </li>
        ))}
      </ul>
      <section className="admin-section">
        <p className="eyebrow">Finalized revisions</p>
        <h2>Pending reporting</h2>
        <ReportingQueue rows={pending} />
      </section>
      <section className="admin-section">
        <h2>Needs correction</h2>
        <ReportingQueue rows={corrections} />
      </section>
    </main>
  );
}

function ReportingQueue({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listReportingQueue>>;
}) {
  if (!rows.length)
    return (
      <p className="text-muted-foreground">No reporting work is waiting.</p>
    );
  return (
    <ul className="member-list">
      {rows.map((row) => (
        <li key={`${row.revisionId}-${row.systemId}`} className="member-row">
          <span>
            {row.courseName} | revision {row.revisionNumber} | {row.systemName}
          </span>
          {row.notes ? (
            <span className="text-muted-foreground">{row.notes}</span>
          ) : null}
          <ReportingDestinationControl
            revisionId={row.revisionId}
            reportingSystemId={row.systemId}
            status={row.status}
            action={updateReportingDestinationAction}
          />
        </li>
      ))}
    </ul>
  );
}

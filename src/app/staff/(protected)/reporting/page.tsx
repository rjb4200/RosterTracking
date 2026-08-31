import { Badge } from "@/components/ui/badge";
import { listReportingRequirements } from "@/modules/reference/requirements";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function ReportingPage() {
  await requirePagePermission(PERMISSIONS.REPORTING_MANAGE);
  const rows = await listReportingRequirements(getDatabase());

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
    </main>
  );
}

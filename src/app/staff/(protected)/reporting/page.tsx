import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { listReportingQueue } from "@/modules/classes/finalization";
import { listActiveReportingSystems } from "@/modules/reference/requirements";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { updateReportingDestinationAction } from "./actions";
import { ReportingDestinationControl } from "./reporting-destination-control";

export const dynamic = "force-dynamic";

const statuses = [
  "pending",
  "entered",
  "needs_correction",
  "not_required",
] as const;

const rosterFormBySystem = {
  fire: "kfs-1a",
} as const;

function readSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportingPage({
  searchParams,
}: PageProps<"/staff/reporting">) {
  const actor = await requirePagePermission(PERMISSIONS.REPORTING_MANAGE);
  const db = getDatabase();
  const query = await searchParams;
  const reportingSystemId = readSearchParam(query.system);
  const status = readSearchParam(query.status);
  const from = readSearchParam(query.from);
  const to = readSearchParam(query.to);
  const [systems, queue] = await Promise.all([
    listActiveReportingSystems(db),
    listReportingQueue(db, actor, {
      reportingSystemId,
      status: statuses.includes(status as (typeof statuses)[number])
        ? status
        : undefined,
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59.999`) : undefined,
    }),
  ]);

  return (
    <main className="admin-content">
      <PageHeading eyebrow="Training Major workspace" title="Reporting queue" />
      <section className="admin-section">
        <p className="eyebrow">Finalized revisions</p>
        <h2>Workload</h2>
        <div className="operational-class-grid">
          {queue.summaries.map((summary) => (
            <article
              key={`${summary.systemId}-${summary.status}`}
              className="operational-class-card"
            >
              <strong>{summary.systemName}</strong>
              <Badge
                variant={
                  summary.status === "needs_correction"
                    ? "destructive"
                    : "secondary"
                }
              >
                {summary.status.replaceAll("_", " ")}
              </Badge>
              <span>{summary.count} revisions</span>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-section">
        <h2>Destination work</h2>
        <form className="inline-form">
          <label htmlFor="reporting-system">Destination</label>
          <select
            id="reporting-system"
            name="system"
            className="select-input"
            defaultValue={reportingSystemId}
          >
            <option value="">All destinations</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
          <label htmlFor="reporting-status">Status</label>
          <select
            id="reporting-status"
            name="status"
            className="select-input"
            defaultValue={status}
          >
            <option value="">Pending and needs correction</option>
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <label htmlFor="reporting-from">From</label>
          <input
            id="reporting-from"
            type="date"
            name="from"
            className="search-input"
            defaultValue={from}
          />
          <label htmlFor="reporting-to">To</label>
          <input
            id="reporting-to"
            type="date"
            name="to"
            className="search-input"
            defaultValue={to}
          />
          <button
            type="submit"
            className={buttonVariants({ variant: "secondary" })}
          >
            Apply filters
          </button>
        </form>
        <ReportingQueue rows={queue.rows} />
      </section>
    </main>
  );
}

function ReportingQueue({
  rows,
}: {
  rows: Awaited<ReturnType<typeof listReportingQueue>>["rows"];
}) {
  if (!rows.length)
    return (
      <p className="text-muted-foreground">No reporting work is waiting.</p>
    );
  return (
    <ul className="member-list">
      {rows.map((row) => (
        <li key={`${row.revisionId}-${row.systemId}`} className="member-row">
          <span>{row.courseName}</span>
          <span className="text-muted-foreground">
            {row.classDate
              ? new Date(row.classDate).toLocaleDateString()
              : "Schedule unavailable"}{" "}
            | {row.leadInstructor ?? "Instructor unavailable"} |{" "}
            {row.attendanceCount} students
          </span>
          <Badge
            variant={
              row.status === "needs_correction" ? "destructive" : "secondary"
            }
          >
            {row.systemName}: {row.status.replaceAll("_", " ")}
          </Badge>
          {row.supersededRevisionNumber ? (
            <span className="text-muted-foreground">
              <Badge variant="secondary">Revised work</Badge> supersedes
              revision {row.supersededRevisionNumber}
              {row.supersededStatus
                ? ` — ${row.systemName}: ${row.supersededStatus.replaceAll("_", " ")}`
                : ""}{" "}
              <Link href={`/staff/classes/${row.classId}`}>
                View revision {row.supersededRevisionNumber}
              </Link>
            </span>
          ) : null}
          {row.systemCode in rosterFormBySystem ? (
            <Link
              href={`/api/staff/official-rosters/${row.revisionId}/${rosterFormBySystem[row.systemCode as keyof typeof rosterFormBySystem]}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Download roster PDF
            </Link>
          ) : null}
          {row.notes ? (
            <span className="text-muted-foreground">{row.notes}</span>
          ) : null}
          <ReportingDestinationControl
            revisionId={row.revisionId}
            reportingSystemId={row.systemId}
            referenceNumber={row.referenceNumber}
            action={updateReportingDestinationAction}
          />
        </li>
      ))}
    </ul>
  );
}

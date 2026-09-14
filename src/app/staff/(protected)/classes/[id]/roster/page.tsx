import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getClassRoster,
  listRosterFormOptions,
} from "@/modules/instructor-roster/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { getDatabase } from "@/server/db/client";

import { AddAttendanceForms, AttendanceControls } from "../../roster-controls";

export const dynamic = "force-dynamic";

export default async function ClassRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  let roster: Awaited<ReturnType<typeof getClassRoster>>;
  try {
    roster = await getClassRoster(db, actor, id);
  } catch {
    notFound();
  }
  const [options, requirements] = await Promise.all([
    listRosterFormOptions(db),
    resolveClassRequirements(db, id),
  ]);
  const renderEntry = (
    entry: (typeof roster.active)[number],
    removed = false,
  ) => (
    <li className="roster-row" key={entry.id}>
      <div>
        <strong>{entry.name}</strong>
        <span>
          {entry.participantType} | {entry.agencyName} | {entry.signInMethod}
        </span>
      </div>
      <div className="roster-credit">
        <Badge variant="outline">
          {entry.creditedHours ?? "Unset"} / {roster.scheduledHours} hours
        </Badge>
        {removed ? (
          <span>
            Removed by {entry.removedBy ?? "staff"}: {entry.removalReason}
          </span>
        ) : (
          <AttendanceControls
            classId={id}
            attendanceId={entry.id}
            creditedHours={entry.creditedHours}
            scheduledHours={roster.scheduledHours}
          />
        )}
      </div>
    </li>
  );
  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Instructor roster</p>
          <h1 className="staff-title">Live attendance</h1>
        </div>
        <Link
          href={`/staff/classes/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to class
        </Link>
      </div>
      <section className="admin-section">
        <h2>Active attendance ({roster.active.length})</h2>
        <p className="roster-note">
          Scheduled class total: {roster.scheduledHours} hours.
        </p>
        <ul className="roster-list">
          {roster.active.map((entry) => renderEntry(entry))}
        </ul>
      </section>
      {["open", "completed"].includes(roster.classRecord.status) ? (
        <section className="admin-section">
          <h2>Manual attendance correction</h2>
          <AddAttendanceForms
            classId={id}
            students={options.students}
            agencies={options.agencies}
            requirements={requirements}
          />
        </section>
      ) : null}
      <section className="admin-section">
        <h2>Removed attendance ({roster.removed.length})</h2>
        <ul className="roster-list">
          {roster.removed.map((entry) => renderEntry(entry, true))}
        </ul>
      </section>
    </main>
  );
}

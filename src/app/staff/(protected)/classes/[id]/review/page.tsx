import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getClassDetail } from "@/modules/classes/services";
import {
  getClassRoster,
  getRosterReadiness,
  listRosterFormOptions,
} from "@/modules/instructor-roster/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { getDatabase } from "@/server/db/client";

import { finalizeClassAction, reopenClassAction } from "../../actions";
import { FinalizationControls } from "../../finalization-controls";
import { AddAttendanceForms, AttendanceControls } from "../../roster-controls";

export const dynamic = "force-dynamic";

export default async function CompletedClassReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  let roster: Awaited<ReturnType<typeof getClassRoster>>;
  let classRecord: Awaited<ReturnType<typeof getClassDetail>>;
  try {
    [roster, classRecord] = await Promise.all([
      getClassRoster(db, actor, id),
      getClassDetail(db, actor, id),
    ]);
  } catch {
    notFound();
  }
  if (classRecord.status !== "completed") notFound();
  const [options, requirements, readiness] = await Promise.all([
    listRosterFormOptions(db),
    resolveClassRequirements(db, id),
    getRosterReadiness(db, actor, id),
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
          <p className="eyebrow">Completed class review</p>
          <h1 className="staff-title">
            {classRecord.course?.name ?? "Class roster"}
          </h1>
          <p>
            {classRecord.site?.name ?? "Online"} | Scheduled total:{" "}
            {roster.scheduledHours} hours
          </p>
        </div>
        <Link
          href={`/staff/classes/${id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to class
        </Link>
      </div>

      <section className="admin-section">
        <p className="eyebrow">Finalization readiness</p>
        <h2>
          {readiness.ready ? "Roster ready to finalize" : "Corrections needed"}
        </h2>
        {readiness.ready ? (
          <p>All active attendance has valid credit and reporting context.</p>
        ) : (
          <ul className="member-list">
            {readiness.issues.map((issue) => (
              <li className="member-row" key={issue}>
                {issue}
              </li>
            ))}
          </ul>
        )}
        <FinalizationControls
          classId={id}
          status={classRecord.status}
          finalizeAction={finalizeClassAction}
          reopenAction={reopenClassAction}
        />
      </section>

      <section className="admin-section">
        <h2>Active attendance ({roster.active.length})</h2>
        <ul className="roster-list">
          {roster.active.map((entry) => renderEntry(entry))}
        </ul>
      </section>
      <section className="admin-section">
        <h2>Manual attendance correction</h2>
        <AddAttendanceForms
          classId={id}
          students={options.students}
          agencies={options.agencies}
          requirements={requirements}
        />
      </section>
      <section className="admin-section">
        <h2>Removed attendance ({roster.removed.length})</h2>
        <ul className="roster-list">
          {roster.removed.map((entry) => renderEntry(entry, true))}
        </ul>
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getFinalizationHistory } from "@/modules/classes/finalization";
import {
  getClassDetail,
  listClassFormOptions,
} from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  formatDepartmentDateTimeInput,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";
import {
  getClassRoster,
  getRosterReadiness,
  listRosterFormOptions,
} from "@/modules/instructor-roster/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { getDatabase } from "@/server/db/client";

import {
  assignInstructorAction,
  finalizeClassAction,
  reopenClassAction,
  saveComponentAction,
  sendOfficialRosterEmailAction,
  updateClassAction,
} from "../../actions";
import { ClassForm } from "../../class-form";
import { ComponentForm } from "../../component-form";
import { FinalizationControls } from "../../finalization-controls";
import { OfficialRosterControls } from "../../official-roster-controls";
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
  const isCompleted = classRecord.status === "completed";
  const isFinalized = classRecord.status === "finalized";
  if (!isCompleted && !isFinalized) notFound();

  const [reviewData, classOptions, revisionHistory] = await Promise.all([
    isCompleted
      ? Promise.all([
          listRosterFormOptions(db),
          resolveClassRequirements(db, id),
          getRosterReadiness(db, actor, id),
        ]).then(([options, requirements, readiness]) => ({
          options,
          requirements,
          readiness,
        }))
      : Promise.resolve(null),
    isCompleted ? listClassFormOptions(db, actor) : Promise.resolve(null),
    isFinalized ? getFinalizationHistory(db, actor, id) : Promise.resolve([]),
  ]);
  const canManageOfficialRosters = isFinalized
    ? Boolean(await getCurrentStaff())
    : false;

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
        ) : isFinalized ? (
          <span className="text-muted-foreground">Locked</span>
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
          <p className="eyebrow">
            {isFinalized ? "Finalized class review" : "Completed class review"}
          </p>
          <h1 className="staff-title">
            {classRecord.course?.name ?? "Class roster"}
          </h1>
          <p>
            {classRecord.site?.name ?? "Online"} | Scheduled total:{" "}
            {roster.scheduledHours} hours
          </p>
        </div>
        <div className="admin-actions">
          <Badge variant={isFinalized ? "default" : "secondary"}>
            {classRecord.status}
          </Badge>
          <Link
            href={`/staff/classes/${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to class
          </Link>
        </div>
      </div>

      <section className="admin-section">
        <p className="eyebrow">Finalization</p>
        <h2>
          {isFinalized
            ? "Roster finalized"
            : reviewData?.readiness.ready
              ? "Roster ready to finalize"
              : "Corrections needed"}
        </h2>
        {isFinalized ? (
          <p>
            This roster is locked. Reopen it with a reason to make corrections.
          </p>
        ) : reviewData && !reviewData.readiness.ready ? (
          <ul className="member-list">
            {reviewData.readiness.issues.map((issue) => (
              <li className="member-row" key={issue}>
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <p>All active attendance has valid credit and reporting context.</p>
        )}
        <FinalizationControls
          classId={id}
          status={classRecord.status}
          finalizeAction={finalizeClassAction}
          reopenAction={reopenClassAction}
          canFinalize={reviewData?.readiness.ready ?? false}
        />
        {isFinalized && revisionHistory.length ? (
          <ul className="member-list">
            {revisionHistory.map((revision) => (
              <li key={revision.id} className="member-row">
                <span>
                  Revision {revision.revisionNumber} finalized by{" "}
                  {revision.finalizedBy}
                </span>
                <span className="text-muted-foreground">
                  {revision.reopenReason
                    ? `Reopened: ${revision.reopenReason}`
                    : "Current or retained revision"}
                </span>
                <span>
                  {revision.destinations
                    .map(
                      (destination) =>
                        `${destination.systemName}: ${destination.status}`,
                    )
                    .join(", ")}
                </span>
                {canManageOfficialRosters ? (
                  <OfficialRosterControls
                    revisionId={revision.id}
                    emailAction={sendOfficialRosterEmailAction}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {isCompleted && classOptions ? (
        <details className="admin-section">
          <summary>Correct class details, sessions, and instructors</summary>
          <section className="admin-section">
            <h2>Class details</h2>
            <ClassForm
              action={updateClassAction}
              {...classOptions}
              values={{
                id: classRecord.id,
                courseId: classRecord.courseId,
                trainingSiteId: classRecord.trainingSiteId,
                hostAgencyId: classRecord.hostAgencyId,
                deliveryMethod: classRecord.deliveryMethod,
                accessPinEnabled: classRecord.accessPinEnabled,
                reportingSystemIds: classRecord.reportingSystems.map(
                  (system) => system.id,
                ),
              }}
            />
          </section>

          <section className="admin-section">
            <h2>Sessions</h2>
            <ul className="member-list">
              {classRecord.components.map((component) => (
                <li key={component.id} className="member-row">
                  <span>{component.title ?? "Training session"}</span>
                  <span>
                    {formatDepartmentDateTime(component.startsAt)} to{" "}
                    {formatDepartmentDateTime(component.endsAt)}
                  </span>
                  <Badge variant="outline">
                    {component.creditedHours} hours
                  </Badge>
                  <ComponentForm
                    classId={classRecord.id}
                    action={saveComponentAction}
                    component={{
                      id: component.id,
                      title: component.title,
                      creditedHours: component.creditedHours,
                      startsAt: formatDepartmentDateTimeInput(
                        component.startsAt,
                      ),
                    }}
                  />
                </li>
              ))}
            </ul>
            <ComponentForm
              classId={classRecord.id}
              action={saveComponentAction}
              defaultStartsAt={roundDepartmentDateTimeToQuarterHour(new Date())}
            />
          </section>

          <section className="admin-section">
            <h2>Instructors</h2>
            <ul className="member-list">
              {classRecord.instructors.map((instructor) => (
                <li key={instructor.userId} className="member-row">
                  <span>{instructor.displayName}</span>
                  {instructor.isLead ? <Badge>Lead</Badge> : null}
                </li>
              ))}
            </ul>
            <form action={assignInstructorAction} className="inline-form">
              <input type="hidden" name="classId" value={classRecord.id} />
              <input type="hidden" name="isLead" value="true" />
              <select name="userId" className="select-input" required>
                {classOptions.staff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                Set lead instructor
              </Button>
            </form>
          </section>
        </details>
      ) : null}

      <section className="admin-section">
        <h2>Active attendance ({roster.active.length})</h2>
        <ul className="roster-list">
          {roster.active.map((entry) => renderEntry(entry))}
        </ul>
      </section>

      {isCompleted && reviewData ? (
        <section className="admin-section">
          <h2>Manual attendance correction</h2>
          <AddAttendanceForms
            classId={id}
            students={reviewData.options.students}
            agencies={reviewData.options.agencies}
            requirements={reviewData.requirements}
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

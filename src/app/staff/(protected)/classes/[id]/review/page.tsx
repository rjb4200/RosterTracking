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
import {
  CompletionCertificateControls,
  OfficialRosterControls,
} from "../../official-roster-controls";
import { AddAttendanceForms, AttendanceControls } from "../../roster-controls";

export const dynamic = "force-dynamic";

function DocumentLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className={buttonVariants({ variant: "outline" })}
    >
      View {label}
    </Link>
  );
}

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
  const latestRevision = revisionHistory[0] ?? null;

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
          <h1 className="staff-title">{classRecord.name ?? "Class roster"}</h1>
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
      </section>

      <section className="admin-section">
        <h2>Documents</h2>
        <p className="roster-note">
          View a document to open its PDF. Use the browser viewer to print or
          save a copy.
        </p>
        <ul className="member-list">
          <li className="member-row">
            <span>Class sign-in record</span>
            <DocumentLink
              href={`/api/staff/class-sign-in-record/${id}?disposition=inline`}
              label="sign-in record"
            />
          </li>
          <li className="member-row">
            <span>Class audit log</span>
            <DocumentLink
              href={`/api/staff/class-audit-log/${id}?disposition=inline`}
              label="audit log"
            />
          </li>
        </ul>
        {isFinalized ? (
          latestRevision && canManageOfficialRosters ? (
            <div className="admin-section">
              <p className="roster-note">
                Official rosters and certificates for revision{" "}
                {latestRevision.revisionNumber}.
              </p>
              <OfficialRosterControls
                revisionId={latestRevision.id}
                emailAction={sendOfficialRosterEmailAction}
              />
              {latestRevision.destinations.some(
                (destination) => destination.systemCode === "kbems",
              ) ? (
                <CompletionCertificateControls revisionId={latestRevision.id} />
              ) : null}
            </div>
          ) : null
        ) : (
          <p className="roster-note">
            Finalize the roster to produce official rosters and completion
            certificates.
          </p>
        )}
      </section>

      {isFinalized && revisionHistory.length ? (
        <section className="admin-section">
          <h2>Revision history</h2>
          <ul className="member-list">
            {revisionHistory.map((revision, index) => {
              const isLatest = index === 0;
              const hasKbems = revision.destinations.some(
                (destination) => destination.systemCode === "kbems",
              );
              return (
                <li key={revision.id} className="member-row">
                  <div>
                    <strong>Revision {revision.revisionNumber}</strong>
                    <span className="text-muted-foreground">
                      Finalized by {revision.finalizedBy} on{" "}
                      {formatDepartmentDateTime(revision.finalizedAt)}
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
                  </div>
                  {canManageOfficialRosters ? (
                    isLatest ? (
                      <span className="text-muted-foreground">
                        Latest revision — see Documents
                      </span>
                    ) : (
                      <div className="member-actions">
                        <OfficialRosterControls
                          revisionId={revision.id}
                          emailAction={sendOfficialRosterEmailAction}
                          showEmail={false}
                        />
                        {hasKbems ? (
                          <CompletionCertificateControls
                            revisionId={revision.id}
                          />
                        ) : null}
                      </div>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
                name: classRecord.name,
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
                    trainingCodes={classOptions.trainingCodes}
                    curricula={classOptions.curricula}
                    curriculumChapters={classOptions.curriculumChapters}
                    recentCurriculumIds={classOptions.recentCurriculumIds}
                    component={{
                      id: component.id,
                      title: component.title,
                      creditedHours: component.creditedHours,
                      startsAt: formatDepartmentDateTimeInput(
                        component.startsAt,
                      ),
                      trainingCodeId: component.trainingCodeId,
                      className: component.className,
                      curriculumId: component.curriculumId,
                      curriculumName: component.curriculumName,
                      curriculumChapter: component.curriculumChapter,
                      lessonPlan: component.lessonPlan,
                      method: component.method,
                    }}
                  />
                </li>
              ))}
            </ul>
            <ComponentForm
              classId={classRecord.id}
              action={saveComponentAction}
              defaultStartsAt={roundDepartmentDateTimeToQuarterHour(new Date())}
              trainingCodes={classOptions.trainingCodes}
              curricula={classOptions.curricula}
              curriculumChapters={classOptions.curriculumChapters}
              recentCurriculumIds={classOptions.recentCurriculumIds}
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

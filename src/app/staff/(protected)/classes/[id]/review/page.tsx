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
import { getCertificateDeliveryOverview } from "@/modules/completion-certificates/service";
import { getTrainingNoticeDeliveryOverview } from "@/modules/individual-training-notices/service";
import {
  getClassRoster,
  getRosterReadiness,
} from "@/modules/instructor-roster/services";
import { TEMPLATE_MAPPINGS } from "@/modules/official-roster-pdfs/mappings";
import { listActiveMtuCatalogItems } from "@/modules/reference/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import {
  assignInstructorAction,
  emailTrainingNoticeAction,
  finalizeClassAction,
  reopenClassAction,
  resendParticipantCertificateAction,
  saveComponentAction,
  sendOfficialRosterEmailAction,
  updateClassAction,
} from "../../actions";
import { CertificateDeliveryControls } from "../../certificate-delivery-controls";
import { ClassForm } from "../../class-form";
import { ClassSummary } from "../../class-summary";
import { ComponentForm } from "../../component-form";
import {
  FinalizationControls,
  ReopenControl,
} from "../../finalization-controls";
import { MtuUsageForm } from "../../mtu-usage-form";
import {
  CompletionCertificateControls,
  OfficialRosterControls,
  RosterDocumentActions,
} from "../../official-roster-controls";
import { AttendanceControls } from "../../roster-controls";
import { TrainingNoticeControls } from "../../training-notice-controls";

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

export default async function ClassReviewPage({
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
  const isOpen = classRecord.status === "open";
  const isFinalized = classRecord.status === "finalized";
  if (!isOpen && !isFinalized) notFound();

  const [reviewData, classOptions, revisionHistory] = await Promise.all([
    isOpen
      ? getRosterReadiness(db, actor, id).then((readiness) => ({ readiness }))
      : Promise.resolve(null),
    isOpen ? listClassFormOptions(db, actor) : Promise.resolve(null),
    isFinalized ? getFinalizationHistory(db, actor, id) : Promise.resolve([]),
  ]);
  const staff = await getCurrentStaff();
  const mtuCatalog = await listActiveMtuCatalogItems(db);
  const canManageOfficialRosters = isFinalized ? Boolean(staff) : false;
  const isLeadInstructor =
    isOpen &&
    Boolean(
      staff &&
        classRecord.instructors.some(
          (instructor) => instructor.isLead && instructor.userId === staff.id,
        ),
    );
  const canReopen = staff ? isAdministrator(staff.roleCodes) : false;
  const latestRevision = revisionHistory[0] ?? null;
  const latestReportsToKbems = Boolean(
    latestRevision?.destinations.some(
      (destination) => destination.systemCode === "kbems",
    ),
  );
  let certificateDeliveries: Awaited<
    ReturnType<typeof getCertificateDeliveryOverview>
  > = [];
  if (
    isFinalized &&
    latestRevision &&
    canManageOfficialRosters &&
    latestReportsToKbems
  ) {
    try {
      certificateDeliveries = await getCertificateDeliveryOverview(
        db,
        actor,
        latestRevision.id,
      );
    } catch {
      certificateDeliveries = [];
    }
  }
  const latestReportsToFire = Boolean(
    latestRevision?.destinations.some(
      (destination) => destination.systemCode === "fire",
    ),
  );
  let noticeDeliveries: Awaited<
    ReturnType<typeof getTrainingNoticeDeliveryOverview>
  > = [];
  if (
    isFinalized &&
    latestRevision &&
    canManageOfficialRosters &&
    latestReportsToFire
  ) {
    try {
      noticeDeliveries = await getTrainingNoticeDeliveryOverview(
        db,
        actor,
        latestRevision.id,
      );
    } catch {
      noticeDeliveries = [];
    }
  }

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
            {isFinalized ? "Finalized class review" : "Review and finalize"}
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
            href={isFinalized ? "/staff/classes" : `/staff/classes/${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {isFinalized ? "Back to classes" : "Back to class"}
          </Link>
        </div>
      </div>

      <section className="admin-section">
        <h2>Class details</h2>
        <ClassSummary classRecord={classRecord} />
      </section>

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
            {canReopen
              ? "This roster is locked. Reopen it from the bottom of this page to make corrections."
              : "This roster is locked."}
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
          canFinalize={reviewData?.readiness.ready ?? false}
          isLeadInstructor={isLeadInstructor}
          isMtuClass={classRecord.reportingSystems.some(
            (system) => system.code === "mtu",
          )}
          mtuCatalog={mtuCatalog}
          mtuUsage={classRecord.mtuUsage}
          activeParticipants={roster.active.length}
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
          {isFinalized && latestRevision && canManageOfficialRosters ? (
            <>
              {Object.values(TEMPLATE_MAPPINGS).map((mapping) => (
                <li key={mapping.formType} className="member-row">
                  <span>{mapping.formType.toUpperCase()} roster</span>
                  <RosterDocumentActions
                    revisionId={latestRevision.id}
                    formType={mapping.formType}
                    emailAction={sendOfficialRosterEmailAction}
                  />
                </li>
              ))}
              {latestRevision.destinations.some(
                (destination) => destination.systemCode === "kbems",
              ) ? (
                <li className="member-row">
                  <span>Completion certificates</span>
                  <DocumentLink
                    href={`/api/staff/completion-certificates/${latestRevision.id}?disposition=inline`}
                    label="certificates"
                  />
                </li>
              ) : null}
            </>
          ) : null}
        </ul>
        {!isFinalized ? (
          <p className="roster-note">
            Finalize the roster to produce the official roster and completion
            certificates.
          </p>
        ) : null}
      </section>

      {isFinalized &&
      latestRevision &&
      canManageOfficialRosters &&
      latestReportsToKbems &&
      certificateDeliveries.length ? (
        <section className="admin-section">
          <h2>Certificate delivery</h2>
          <p className="roster-note">
            Each participant is emailed their own certificate when the class is
            finalized. Resend one, or send to a different address.
          </p>
          <CertificateDeliveryControls
            revisionId={latestRevision.id}
            classId={id}
            participants={certificateDeliveries}
            action={resendParticipantCertificateAction}
          />
        </section>
      ) : null}

      {isFinalized &&
      latestRevision &&
      canManageOfficialRosters &&
      latestReportsToFire ? (
        <details className="admin-section">
          <summary>Training notices</summary>
          <p className="roster-note">
            View or email an individual training notice for any participant.
            Yellow is the department copy; White is the participant copy.
          </p>
          <TrainingNoticeControls
            revisionId={latestRevision.id}
            classId={id}
            participants={noticeDeliveries}
            action={emailTrainingNoticeAction}
          />
        </details>
      ) : null}

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
                    {revision.signedByName ? (
                      <span className="text-muted-foreground">
                        Signed by {revision.signedByName} on{" "}
                        {revision.signedAt
                          ? formatDepartmentDateTime(revision.signedAt)
                          : "—"}
                      </span>
                    ) : null}
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

      {isOpen && classOptions ? (
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
                objectives: classRecord.objectives,
                courseType: classRecord.courseType,
                courseNumber: classRecord.courseNumber,
                mtuUsage: classRecord.mtuUsage,
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

      <section className="admin-section">
        <h2>Removed attendance ({roster.removed.length})</h2>
        <ul className="roster-list">
          {roster.removed.map((entry) => renderEntry(entry, true))}
        </ul>
      </section>

      {classRecord.reportingSystems.some((system) => system.code === "mtu") ||
      classRecord.mtuUsage ? (
        <section className="admin-section">
          <h2>MTU usage</h2>
          <p className="roster-note">
            Operational usage can be updated after finalization without changing
            the signed roster.
          </p>
          <MtuUsageForm
            classId={id}
            usage={classRecord.mtuUsage}
            mtuCatalog={mtuCatalog}
            activeParticipants={roster.active.length}
          />
        </section>
      ) : null}

      {isFinalized && canReopen ? (
        <section className="admin-section">
          <h2>Reopen roster</h2>
          <p className="roster-note">
            Reopening unlocks the class for corrections and retains this
            revision. Only an Administrator can reopen.
          </p>
          <ReopenControl classId={id} reopenAction={reopenClassAction} />
        </section>
      ) : null}
    </main>
  );
}

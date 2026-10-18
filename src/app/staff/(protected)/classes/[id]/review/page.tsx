import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
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
  correctCredentialAction,
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
import { CredentialCorrectionControl } from "../../credential-correction-control";
import {
  FinalizationControls,
  ReopenControl,
} from "../../finalization-controls";
import { InstructorAssignmentForm } from "../../instructor-assignment-form";
import {
  CompletionCertificateControls,
  OfficialRosterControls,
  RosterDocumentActions,
} from "../../official-roster-controls";
import { AttendanceControls } from "../../roster-controls";
import { TrainingNoticeControls } from "../../training-notice-controls";

export const dynamic = "force-dynamic";

type LatestRevision =
  | Awaited<ReturnType<typeof getFinalizationHistory>>[number]
  | null;

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

function DocumentsList({
  classId,
  isFinalized,
  latestRevision,
  canManageOfficialRosters,
}: {
  classId: string;
  isFinalized: boolean;
  latestRevision: LatestRevision;
  canManageOfficialRosters: boolean;
}) {
  return (
    <ul className="member-list">
      <li className="member-row">
        <span>Class sign-in record</span>
        <DocumentLink
          href={`/api/staff/class-sign-in-record/${classId}?disposition=inline`}
          label="sign-in record"
        />
      </li>
      <li className="member-row">
        <span>Class audit log</span>
        <DocumentLink
          href={`/api/staff/class-audit-log/${classId}?disposition=inline`}
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
  const componentKind = classRecord.reportingSystems.some(
    (system) => system.code === "fire",
  )
    ? "fire"
    : classRecord.reportingSystems.some((system) => system.code === "kbems")
      ? "ems"
      : undefined;
  const isMtuClass = classRecord.reportingSystems.some(
    (system) => system.code === "mtu",
  );
  const reportingLabel =
    classRecord.reportingSystems.map((system) => system.name).join(", ") ||
    "None selected";

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
  // Credentials may be corrected only while the class is open; a finalized
  // revision is immutable and is changed through the reopen path.
  const canCorrectRosterCredentials = isOpen;
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
        ) : (
          <>
            {isFinalized ? (
              <span className="text-muted-foreground">Locked</span>
            ) : (
              <AttendanceControls
                classId={id}
                attendanceId={entry.id}
                creditedHours={entry.creditedHours}
                scheduledHours={roster.scheduledHours}
              />
            )}
            {canCorrectRosterCredentials && entry.corrections.length > 0 ? (
              <CredentialCorrectionControl
                classId={id}
                attendanceId={entry.id}
                participantName={entry.name}
                credentials={entry.corrections}
                action={correctCredentialAction}
              />
            ) : null}
          </>
        )}
      </div>
    </li>
  );

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow={isFinalized ? "Finalized class review" : "Review and finalize"}
        title={classRecord.name ?? "Class roster"}
        meta={
          <p>
            {classRecord.site?.name ?? "Online"} | Scheduled total:{" "}
            {roster.scheduledHours} hours
          </p>
        }
        actions={
          <>
            <Badge variant={isFinalized ? "default" : "secondary"}>
              {classRecord.status}
            </Badge>
            <Link
              href={isFinalized ? "/staff/classes" : `/staff/classes/${id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {isFinalized ? "Back to classes" : "Back to class"}
            </Link>
          </>
        }
      />

      {isOpen ? (
        <>
          <section className="review-card" id="attendance">
            <header className="review-card-head">
              <span className="review-step" aria-hidden>
                1
              </span>
              <h2>Attendance</h2>
              <Badge variant="outline">{roster.active.length} active</Badge>
            </header>
            <p className="roster-note">
              Class hours: {roster.scheduledHours}. A class that ran long is
              recorded by raising the session hours —{" "}
              <a href="#correct">adjust the schedule</a> and every participant
              credited at the full session follows the new total.
            </p>
            {roster.active.length ? (
              <ul className="roster-list">
                {roster.active.map((entry) => renderEntry(entry))}
              </ul>
            ) : (
              <p className="roster-note">No one has signed in yet.</p>
            )}
            {roster.removed.length ? (
              <details className="review-subsection">
                <summary>Removed attendance ({roster.removed.length})</summary>
                <ul className="roster-list">
                  {roster.removed.map((entry) => renderEntry(entry, true))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="review-card" id="reporting">
            <header className="review-card-head">
              <span className="review-step" aria-hidden>
                2
              </span>
              <h2>Reporting &amp; MTU</h2>
            </header>
            <p className="roster-note">Reporting: {reportingLabel}.</p>
            {isMtuClass ? (
              <p className="roster-note">
                MTU usage is confirmed in step 3 when the roster is signed.
              </p>
            ) : null}
          </section>

          <section className="review-card" id="sign">
            <header className="review-card-head">
              <span className="review-step" aria-hidden>
                3
              </span>
              <h2>Sign &amp; finalize</h2>
              <Badge
                variant={reviewData?.readiness.ready ? "default" : "secondary"}
              >
                {reviewData?.readiness.ready ? "Ready" : "Needs attention"}
              </Badge>
            </header>
            {reviewData && !reviewData.readiness.ready ? (
              <ul className="member-list">
                {reviewData.readiness.issues.map((issue) => (
                  <li className="member-row" key={issue}>
                    {issue}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                All active attendance has valid credit and reporting context.
              </p>
            )}
            <FinalizationControls
              classId={id}
              status={classRecord.status}
              finalizeAction={finalizeClassAction}
              canFinalize={reviewData?.readiness.ready ?? false}
              isLeadInstructor={isLeadInstructor}
              isMtuClass={isMtuClass}
              mtuCatalog={mtuCatalog}
              mtuUsage={classRecord.mtuUsage}
              activeParticipants={roster.active.length}
            />
          </section>

          <details className="admin-section">
            <summary>Class details</summary>
            <ClassSummary classRecord={classRecord} />
          </details>

          <details className="admin-section">
            <summary>Documents</summary>
            <p className="roster-note">
              View a document to open its PDF. Use the browser viewer to print
              or save a copy.
            </p>
            <DocumentsList
              classId={id}
              isFinalized={isFinalized}
              latestRevision={latestRevision}
              canManageOfficialRosters={canManageOfficialRosters}
            />
            <p className="roster-note">
              Finalize the roster to produce the official roster and completion
              certificates.
            </p>
          </details>

          {classOptions ? (
            <details className="admin-section" id="correct">
              <summary>
                Correct class details, sessions, and instructors
              </summary>
              <section className="admin-section">
                <h3>Class details</h3>
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
                    emsCategoryId: classRecord.emsCategoryId,
                    mtuUsage: classRecord.mtuUsage,
                    reportingSystemIds: classRecord.reportingSystems.map(
                      (system) => system.id,
                    ),
                  }}
                />
              </section>

              <section className="admin-section">
                <h3>Sessions</h3>
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
                        trainingCodeKind={componentKind}
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
                  defaultStartsAt={roundDepartmentDateTimeToQuarterHour(
                    new Date(),
                  )}
                  trainingCodes={classOptions.trainingCodes}
                  trainingCodeKind={componentKind}
                  curricula={classOptions.curricula}
                  curriculumChapters={classOptions.curriculumChapters}
                  recentCurriculumIds={classOptions.recentCurriculumIds}
                />
              </section>

              <section className="admin-section">
                <h3>Instructors</h3>
                <ul className="member-list">
                  {classRecord.instructors.map((instructor) => (
                    <li key={instructor.userId} className="member-row">
                      <span>{instructor.displayName}</span>
                      {instructor.isLead ? <Badge>Lead</Badge> : null}
                    </li>
                  ))}
                </ul>
                <InstructorAssignmentForm
                  action={assignInstructorAction}
                  classId={classRecord.id}
                  staff={classOptions.staff}
                />
              </section>
            </details>
          ) : null}
        </>
      ) : (
        <>
          <section className="admin-section">
            <h2>Class details</h2>
            <ClassSummary classRecord={classRecord} />
          </section>

          <section className="admin-section">
            <h2>Roster ({roster.active.length})</h2>
            <ul className="roster-list">
              {roster.active.map((entry) => renderEntry(entry))}
            </ul>
            {roster.removed.length ? (
              <details className="review-subsection">
                <summary>Removed attendance ({roster.removed.length})</summary>
                <ul className="roster-list">
                  {roster.removed.map((entry) => renderEntry(entry, true))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="admin-section">
            <h2>Documents</h2>
            <p className="roster-note">
              View a document to open its PDF. Use the browser viewer to print
              or save a copy.
            </p>
            <DocumentsList
              classId={id}
              isFinalized={isFinalized}
              latestRevision={latestRevision}
              canManageOfficialRosters={canManageOfficialRosters}
            />
          </section>

          {latestRevision &&
          canManageOfficialRosters &&
          latestReportsToKbems &&
          certificateDeliveries.length ? (
            <section className="admin-section">
              <h2>Certificate delivery</h2>
              <p className="roster-note">
                Each participant is emailed their own certificate when the class
                is finalized. Resend one, or send to a different address.
              </p>
              <CertificateDeliveryControls
                revisionId={latestRevision.id}
                classId={id}
                participants={certificateDeliveries}
                action={resendParticipantCertificateAction}
              />
            </section>
          ) : null}

          {latestRevision && canManageOfficialRosters && latestReportsToFire ? (
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

          {revisionHistory.length ? (
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

          {canReopen ? (
            <section className="admin-section">
              <h2>Reopen roster</h2>
              <p className="roster-note">
                Reopening unlocks the class for corrections and retains this
                revision. Only an Administrator can reopen.
              </p>
              <ReopenControl classId={id} reopenAction={reopenClassAction} />
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

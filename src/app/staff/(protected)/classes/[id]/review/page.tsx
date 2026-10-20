import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getFinalizationHistory } from "@/modules/classes/finalization";
import type { MtuUsage } from "@/modules/classes/mtu";
import {
  getClassDetail,
  listClassFormOptions,
} from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  formatDepartmentDateTimeInput,
  formatHours,
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
  removeInstructorAction,
  reopenClassAction,
  resendParticipantCertificateAction,
  saveComponentAction,
  sendOfficialRosterEmailAction,
  updateClassAction,
} from "../../actions";
import { CertificateDeliveryControls } from "../../certificate-delivery-controls";
import { ClassForm } from "../../class-form";
import { ComponentForm } from "../../component-form";
import { CredentialCorrectionControl } from "../../credential-correction-control";
import {
  FinalizationControls,
  ReopenControl,
} from "../../finalization-controls";
import { InstructorAssignmentForm } from "../../instructor-assignment-form";
import { InstructorRowActions } from "../../instructor-controls";
import { MtuUsageForm } from "../../mtu-usage-form";
import {
  CompletionCertificateControls,
  OfficialRosterControls,
  RosterDocumentActions,
} from "../../official-roster-controls";
import { AttendanceControls } from "../../roster-controls";
import { TrainingNoticeControls } from "../../training-notice-controls";
import {
  AreaOpener,
  WorkspaceArea,
  WorkspaceProvider,
} from "../../workspace-areas";

export const dynamic = "force-dynamic";

type LatestRevision =
  | Awaited<ReturnType<typeof getFinalizationHistory>>[number]
  | null;
type RosterEntry = Awaited<ReturnType<typeof getClassRoster>>["active"][number];

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

/** The workspace's review core: the roster, compact, expanding only on issues. */
function RosterTable({
  entries,
  scheduledHours,
  isFinalized,
  attentionIds,
  classId,
}: {
  entries: RosterEntry[];
  scheduledHours: number;
  isFinalized: boolean;
  attentionIds: string[];
  classId: string;
}) {
  if (!entries.length) {
    return <p className="roster-note">No one has signed in yet.</p>;
  }
  return (
    <table className="roster-table">
      <thead>
        <tr>
          <th>Participant</th>
          <th>Credited hours</th>
          <th>Adjustment</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const needsAttention =
            attentionIds.includes(entry.id) || entry.corrections.length > 0;
          return (
            <tr
              key={entry.id}
              className={needsAttention ? "roster-row-attention" : undefined}
            >
              <td>
                <strong>{entry.name}</strong>
                {needsAttention ? (
                  <span
                    className="roster-attention-dot"
                    role="img"
                    aria-label="Needs attention"
                  />
                ) : null}
              </td>
              <td>
                <Badge variant="outline">
                  {entry.creditedHours == null
                    ? "Unset"
                    : formatHours(entry.creditedHours)}{" "}
                  / {formatHours(scheduledHours)}
                </Badge>
              </td>
              <td>{entry.creditAdjustmentReason ?? "—"}</td>
              <td>
                {isFinalized ? (
                  <span className="text-muted-foreground">Locked</span>
                ) : (
                  <details className="roster-row-actions">
                    <summary>Adjust</summary>
                    <AttendanceControls
                      classId={classId}
                      attendanceId={entry.id}
                      creditedHours={entry.creditedHours}
                      scheduledHours={scheduledHours}
                    />
                    {entry.corrections.length > 0 ? (
                      <CredentialCorrectionControl
                        classId={classId}
                        attendanceId={entry.id}
                        participantName={entry.name}
                        credentials={entry.corrections}
                        action={correctCredentialAction}
                      />
                    ) : null}
                  </details>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The MTU review list: the full recorded usage, grouped, with provenance. */
function MtuReviewList({ usage }: { usage: MtuUsage | null }) {
  const equipment = (usage?.items ?? []).filter(
    (item) => item.kind === "equipment",
  );
  const supplies = (usage?.items ?? []).filter(
    (item) => item.kind === "supplies",
  );
  const transport = (usage?.items ?? []).filter(
    (item) => item.kind === "transport",
  );
  const hasOther = Boolean(
    usage?.equipmentUsed || usage?.usedSupplies || usage?.mileage,
  );
  if (!equipment.length && !supplies.length && !transport.length && !hasOther) {
    return <p className="roster-note">Nothing recorded.</p>;
  }
  return (
    <dl className="mtu-review">
      {equipment.length ? (
        <>
          <dt>Equipment</dt>
          <dd>{equipment.map((item) => item.name).join(" · ")}</dd>
        </>
      ) : null}
      {supplies.length ? (
        <>
          <dt>Supplies</dt>
          <dd>
            <ul className="mtu-review-list">
              {supplies.map((item) => (
                <li key={item.itemId}>
                  <span>
                    {item.quantity ?? "?"} × {item.name}
                    {item.unitLabel ? ` (${item.unitLabel})` : ""}
                  </span>
                  {item.source === "suggested" ? (
                    <span className="mtu-review-marker">estimated</span>
                  ) : (
                    <span className="mtu-review-marker">
                      set
                      {item.suggestion !== null &&
                      item.suggestion !== item.quantity
                        ? ` · estimate ${item.suggestion}`
                        : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </>
      ) : null}
      {transport.length ? (
        <>
          <dt>Transport</dt>
          <dd>
            {transport
              .map((item) =>
                item.mileage == null
                  ? item.name
                  : `${item.name} · ${item.mileage} mi`,
              )
              .join(" · ")}
          </dd>
        </>
      ) : null}
      {hasOther ? (
        <>
          <dt>Other</dt>
          <dd>
            {[
              usage?.equipmentUsed,
              usage?.usedSupplies,
              usage?.mileage ? `${usage.mileage} mi` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </dd>
        </>
      ) : null}
    </dl>
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
  const instructorNames =
    classRecord.instructors
      .map((instructor) => instructor.displayName)
      .join(", ") || "None assigned";

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
  const attentionIds = reviewData?.readiness.attentionIds ?? [];
  const usage = classRecord.mtuUsage;
  const mtuRecorded = Boolean(
    usage &&
      ((usage.items?.length ?? 0) > 0 ||
        usage.equipmentUsed ||
        usage.mileage ||
        usage.usedSupplies),
  );
  const estimatedSupplyCount = (usage?.items ?? []).filter(
    (item) => item.kind === "supplies" && item.source === "suggested",
  ).length;
  // Readiness the workspace acts on: each blocker opens the area that fixes it.
  const blockers: { message: string; area: string; label: string }[] = [
    ...(reviewData?.readiness.issues ?? []).map((message) => ({
      message,
      area: "roster",
      label: "roster",
    })),
    ...(isMtuClass && !mtuRecorded
      ? [{ message: "No MTU usage recorded.", area: "mtu", label: "MTU usage" }]
      : []),
  ];
  const ready = blockers.length === 0;

  const renderRemoved = (entry: RosterEntry) => (
    <li className="roster-row" key={entry.id}>
      <div>
        <strong>{entry.name}</strong>
      </div>
      <div className="roster-credit">
        <span>
          Removed by {entry.removedBy ?? "staff"}: {entry.removalReason}
        </span>
      </div>
    </li>
  );

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow={isFinalized ? "Finalized class review" : "Post-class review"}
        title={classRecord.name ?? "Class roster"}
        meta={
          <p>
            {classRecord.site?.name ?? "Online"} | Scheduled total:{" "}
            {formatHours(roster.scheduledHours)}
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
        <WorkspaceProvider>
          <section className="workspace" aria-label="Class summary">
            <p className="workspace-status">
              {ready ? (
                <Badge>Ready to finalize</Badge>
              ) : (
                <Badge variant="secondary">
                  Needs correction ({blockers.length})
                </Badge>
              )}
            </p>

            <WorkspaceArea
              id="class"
              label="Class & reporting"
              summary={
                <>
                  {classRecord.name ?? "Untitled"} ·{" "}
                  {classRecord.site?.name ?? "Online"} · {reportingLabel}
                </>
              }
            >
              {classOptions ? (
                <ClassForm
                  action={updateClassAction}
                  {...classOptions}
                  hideMtuUsage
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
              ) : (
                <p className="roster-note">Class editing is unavailable.</p>
              )}
            </WorkspaceArea>

            <WorkspaceArea
              id="schedule"
              label="Schedule & hours"
              summary={
                <>
                  {classRecord.components.length} session
                  {classRecord.components.length === 1 ? "" : "s"} ·{" "}
                  {formatHours(roster.scheduledHours)}
                </>
              }
            >
              <p className="roster-note">
                A class that ran long is recorded by raising a session&apos;s
                credited hours. Everyone still credited at the full total
                follows the new total; a participant already adjusted down keeps
                their value.
              </p>
              <ul className="member-list">
                {classRecord.components.map((component) => (
                  <li key={component.id} className="member-row">
                    <span>{component.title ?? "Training session"}</span>
                    <span>
                      {formatDepartmentDateTime(component.startsAt)} to{" "}
                      {formatDepartmentDateTime(component.endsAt)}
                    </span>
                    <Badge variant="outline">
                      {formatHours(component.creditedHours)}
                    </Badge>
                    {classOptions ? (
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
                    ) : null}
                  </li>
                ))}
              </ul>
              {classOptions ? (
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
              ) : null}
            </WorkspaceArea>

            <WorkspaceArea
              id="instructors"
              label="Instructors"
              summary={instructorNames}
            >
              <ul className="member-list">
                {classRecord.instructors.map((instructor) => (
                  <li key={instructor.userId} className="member-row">
                    <span>{instructor.displayName}</span>
                    {instructor.isLead ? (
                      <Badge>Lead</Badge>
                    ) : (
                      <Badge variant="secondary">Assisting</Badge>
                    )}
                    {classOptions ? (
                      <InstructorRowActions
                        classId={classRecord.id}
                        userId={instructor.userId}
                        isLead={instructor.isLead}
                        assignAction={assignInstructorAction}
                        removeAction={removeInstructorAction}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="roster-note">
                The lead instructor signs the roster.
              </p>
              {classRecord.reportingSystems.some(
                (system) => system.code === "fire",
              ) ? (
                <p className="roster-note">
                  Fire reporting requires an assigned instructor with a valid
                  Fire FFN and instructor level.
                </p>
              ) : null}
              {classOptions ? (
                <InstructorAssignmentForm
                  action={assignInstructorAction}
                  classId={classRecord.id}
                  staff={classOptions.staff}
                />
              ) : null}
            </WorkspaceArea>

            {isMtuClass ? (
              <WorkspaceArea
                id="mtu"
                label="MTU usage"
                review={<MtuReviewList usage={usage} />}
              >
                <MtuUsageForm
                  classId={id}
                  usage={classRecord.mtuUsage}
                  mtuCatalog={mtuCatalog}
                  activeParticipants={roster.active.length}
                />
              </WorkspaceArea>
            ) : null}
          </section>

          <section className="workspace" aria-label="Roster" id="roster">
            <h2 className="workspace-heading">Roster</h2>
            <RosterTable
              entries={roster.active}
              scheduledHours={roster.scheduledHours}
              isFinalized={false}
              attentionIds={attentionIds}
              classId={id}
            />
            {roster.removed.length ? (
              <details className="review-subsection">
                <summary>Removed attendance ({roster.removed.length})</summary>
                <ul className="roster-list">
                  {roster.removed.map((entry) => renderRemoved(entry))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="workspace" aria-label="Finalize">
            <h2 className="workspace-heading">Finalize</h2>
            {blockers.length ? (
              <ul className="member-list">
                {blockers.map((blocker) => (
                  <li className="member-row" key={blocker.message}>
                    <span>{blocker.message}</span>
                    {blocker.area === "roster" ? (
                      <a href="#roster" className="workspace-area-opener">
                        Fix roster
                      </a>
                    ) : (
                      <AreaOpener area={blocker.area}>
                        Fix {blocker.label}
                      </AreaOpener>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                All active attendance has valid credit and reporting context.
              </p>
            )}
            {isMtuClass && estimatedSupplyCount > 0 ? (
              <p className="workspace-advisory">
                {estimatedSupplyCount}{" "}
                {estimatedSupplyCount === 1
                  ? "supply still uses"
                  : "supplies still use"}{" "}
                the roster estimate.{" "}
                <AreaOpener area="mtu">Review MTU usage</AreaOpener>
              </p>
            ) : null}
            <FinalizationControls
              classId={id}
              status={classRecord.status}
              finalizeAction={finalizeClassAction}
              canFinalize={ready}
              isLeadInstructor={isLeadInstructor}
            />
          </section>
        </WorkspaceProvider>
      ) : (
        <>
          <section className="admin-section">
            <h2>Roster finalized</h2>
            <p className="roster-note">
              This roster is locked.
              {canReopen
                ? " Reopen it from the bottom of this page to make corrections."
                : ""}
            </p>
          </section>

          <section className="admin-section">
            <h2>Class details</h2>
            <p className="roster-note">
              {classRecord.name ?? "Untitled"} ·{" "}
              {classRecord.site?.name ?? "Online"} · {reportingLabel} ·{" "}
              {instructorNames}
            </p>
          </section>

          <section className="admin-section">
            <h2>Roster ({roster.active.length})</h2>
            <RosterTable
              entries={roster.active}
              scheduledHours={roster.scheduledHours}
              isFinalized
              attentionIds={attentionIds}
              classId={id}
            />
            {roster.removed.length ? (
              <details className="review-subsection">
                <summary>Removed attendance ({roster.removed.length})</summary>
                <ul className="roster-list">
                  {roster.removed.map((entry) => renderRemoved(entry))}
                </ul>
              </details>
            ) : null}
          </section>

          <section className="admin-section">
            <h2>Documents &amp; delivery</h2>
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

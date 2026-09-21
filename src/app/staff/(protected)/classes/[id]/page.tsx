import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getFinalizationHistory } from "@/modules/classes/finalization";
import {
  buildClassSignInUrl,
  createClassQrDataUrl,
} from "@/modules/classes/qr";
import {
  getClassDetail,
  getClassPublicAccess,
} from "@/modules/classes/services";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import {
  getClassRoster,
  listRosterFormOptions,
} from "@/modules/instructor-roster/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { resolveClassRequirements } from "@/modules/student-sign-in/requirements";
import { getDatabase } from "@/server/db/client";

import {
  finalizeClassAction,
  reopenClassAction,
  sendOfficialRosterEmailAction,
  transitionClassAction,
} from "../actions";
import { FinalizationControls } from "../finalization-controls";
import { LifecycleControls } from "../lifecycle-controls";
import { OfficialRosterControls } from "../official-roster-controls";
import { AddAttendanceForms } from "../roster-controls";
import { TokenPanel } from "../token-panel";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  let classRecord: Awaited<ReturnType<typeof getClassDetail>>;
  try {
    classRecord = await getClassDetail(db, actor, id);
  } catch {
    notFound();
  }

  const isOpen = classRecord.status === "open";
  const isCompleted = classRecord.status === "completed";
  const isFinalized = classRecord.status === "finalized";
  const isCancelled = classRecord.status === "cancelled";
  const editable = !isFinalized && !isCancelled;
  const showReview = isCompleted || isFinalized;

  const [revisionHistory, roster, rosterOptions, requirements, publicAccess] =
    await Promise.all([
      showReview ? getFinalizationHistory(db, actor, id) : Promise.resolve([]),
      isOpen ? getClassRoster(db, actor, id) : null,
      isOpen ? listRosterFormOptions(db) : null,
      isOpen ? resolveClassRequirements(db, id) : null,
      isOpen ? getClassPublicAccess(db, actor, id) : null,
    ]);
  const canManageOfficialRosters = Boolean(await getCurrentStaff());
  const signInUrl = publicAccess
    ? buildClassSignInUrl(publicAccess.publicCode)
    : null;
  const qrDataUrl = signInUrl ? await createClassQrDataUrl(signInUrl) : null;

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Class</p>
          <h1 className="staff-title">{classRecord.course?.name ?? "Class"}</h1>
          <p>
            {classRecord.site?.name ?? "Online"} |{" "}
            {classRecord.deliveryMethod.replace("_", " ")} |{" "}
            {classRecord.components[0]
              ? formatDepartmentDateTime(classRecord.components[0].startsAt)
              : "No session scheduled"}
          </p>
        </div>
        <div className="admin-actions">
          <Badge variant={isOpen ? "default" : "secondary"}>
            {classRecord.status}
          </Badge>
          <Link
            href="/staff/classes"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
        </div>
      </div>

      <section className="admin-section">
        <LifecycleControls
          classId={classRecord.id}
          status={classRecord.status}
          action={transitionClassAction}
        />
      </section>

      {isOpen && roster && rosterOptions && requirements ? (
        <section className="admin-section class-command-screen">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">Live class</p>
              <h2>{roster.active.length} signed-in students</h2>
              <p>Host agency: {classRecord.hostAgency?.name ?? "Not set"}</p>
            </div>
            <Link
              href={`/staff/classes/${id}/sign-in-record`}
              className={buttonVariants({ variant: "secondary" })}
            >
              Sign-in record
            </Link>
          </div>
          {publicAccess && signInUrl && qrDataUrl ? (
            <TokenPanel
              accessPin={publicAccess.accessPin}
              qrDataUrl={qrDataUrl}
              signInUrl={signInUrl}
            />
          ) : null}
          <div className="command-roster">
            <div>
              <h3>Roster</h3>
              <ul className="roster-list">
                {roster.active.map((entry) => (
                  <li key={entry.id} className="roster-row">
                    <div>
                      <strong>{entry.name}</strong>
                      <span>
                        {entry.agencyName ?? "No agency"} |{" "}
                        {formatDepartmentDateTime(entry.signedInAt)}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {entry.creditedHours ?? roster.scheduledHours} hours
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Add attendance</h3>
              <AddAttendanceForms
                classId={id}
                students={rosterOptions.students}
                agencies={rosterOptions.agencies}
                requirements={requirements}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="admin-heading">
          <h2>Class details</h2>
          {editable ? (
            <Link
              href={`/staff/classes/${id}/edit`}
              className={buttonVariants({ variant: "secondary" })}
            >
              Edit class details
            </Link>
          ) : null}
        </div>
        <dl className="wizard-review">
          <dt>Course</dt>
          <dd>{classRecord.course?.name}</dd>
          <dt>Training site</dt>
          <dd>{classRecord.site?.name ?? "Online"}</dd>
          <dt>Delivery</dt>
          <dd>{classRecord.deliveryMethod.replace("_", " ")}</dd>
          <dt>Host agency</dt>
          <dd>{classRecord.hostAgency?.name ?? "Not set"}</dd>
          <dt>Reporting systems</dt>
          <dd>
            {classRecord.reportingSystems
              .map((system) => system.name)
              .join(", ") || "None selected"}
          </dd>
          <dt>Lead instructor</dt>
          <dd>
            {classRecord.instructors
              .filter((instructor) => instructor.isLead)
              .map((instructor) => instructor.displayName)
              .join(", ") || "Not assigned"}
          </dd>
          <dt>Sessions</dt>
          <dd>
            {classRecord.components.length === 0
              ? "No sessions"
              : classRecord.components
                  .map(
                    (component) =>
                      `${formatDepartmentDateTime(component.startsAt)} (${component.creditedHours}h)`,
                  )
                  .join(", ")}
          </dd>
        </dl>
      </section>

      {showReview ? (
        <section className="admin-section">
          <div className="admin-heading">
            <h2>Finalization</h2>
            {isCompleted ? (
              <Link
                href={`/staff/classes/${id}/review`}
                className={buttonVariants({ variant: "secondary" })}
              >
                Review &amp; finalize
              </Link>
            ) : null}
          </div>
          <FinalizationControls
            classId={classRecord.id}
            status={classRecord.status}
            finalizeAction={finalizeClassAction}
            reopenAction={reopenClassAction}
          />
          {revisionHistory.length ? (
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
      ) : null}
    </main>
  );
}

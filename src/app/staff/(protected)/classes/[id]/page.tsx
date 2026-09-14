import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getFinalizationHistory } from "@/modules/classes/finalization";
import {
  buildClassSignInUrl,
  createClassQrDataUrl,
} from "@/modules/classes/qr";
import {
  getClassDetail,
  getClassPublicAccess,
  listClassFormOptions,
} from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  formatDepartmentDateTimeInput,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";
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
  assignInstructorAction,
  finalizeClassAction,
  reopenClassAction,
  saveComponentAction,
  sendOfficialRosterEmailAction,
  transitionClassAction,
  updateClassAction,
} from "../actions";
import { ClassForm } from "../class-form";
import { ComponentForm } from "../component-form";
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
  const [options, revisionHistory, staff, roster, rosterOptions, requirements] =
    await Promise.all([
      listClassFormOptions(db),
      getFinalizationHistory(db, actor, id),
      getCurrentStaff(),
      classRecord.status === "open" ? getClassRoster(db, actor, id) : null,
      classRecord.status === "open" ? listRosterFormOptions(db) : null,
      classRecord.status === "open" ? resolveClassRequirements(db, id) : null,
    ]);
  const canManageOfficialRosters = Boolean(staff);
  const isDraft = classRecord.status === "draft";
  const newSessionStartsAt = roundDepartmentDateTimeToQuarterHour(new Date());
  const publicAccess =
    classRecord.status === "open"
      ? await getClassPublicAccess(db, actor, classRecord.id)
      : null;
  const signInUrl = publicAccess
    ? buildClassSignInUrl(publicAccess.publicCode)
    : null;
  const qrDataUrl = signInUrl ? await createClassQrDataUrl(signInUrl) : null;

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Class record</p>
          <h1 className="staff-title">{classRecord.course?.name ?? "Class"}</h1>
        </div>
        <div className="admin-actions">
          <Badge
            variant={classRecord.status === "open" ? "default" : "secondary"}
          >
            {classRecord.status}
          </Badge>
          <Link
            href="/staff/classes"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          {["open", "completed"].includes(classRecord.status) ? (
            <Link
              href={`/staff/classes/${classRecord.id}/roster`}
              className={buttonVariants({ variant: "secondary" })}
            >
              Instructor roster
            </Link>
          ) : null}
        </div>
      </div>

      {classRecord.status === "open" &&
      roster &&
      rosterOptions &&
      requirements ? (
        <section className="admin-section class-command-screen">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">Live class</p>
              <h2>{roster.active.length} signed-in students</h2>
              <p>
                {classRecord.site?.name ?? "Online"} |{" "}
                {classRecord.deliveryMethod.replace("_", " ")}
              </p>
            </div>
            <Link
              href={`/staff/classes/${id}/roster`}
              className={buttonVariants({ variant: "secondary" })}
            >
              View full roster
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
              <h3>Live roster</h3>
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
              <h3>Add student</h3>
              <AddAttendanceForms
                classId={id}
                students={rosterOptions.students}
                agencies={rosterOptions.agencies}
                requirements={requirements}
              />
            </div>
          </div>
          <LifecycleControls
            classId={classRecord.id}
            status={classRecord.status}
            action={transitionClassAction}
          />
        </section>
      ) : null}

      {isDraft ? (
        <section className="admin-section">
          <p className="eyebrow">Step 1: class setup</p>
          <ClassForm
            action={updateClassAction}
            {...options}
            values={{
              id: classRecord.id,
              courseId: classRecord.courseId,
              trainingSiteId: classRecord.trainingSiteId,
              deliveryMethod: classRecord.deliveryMethod,
              accessPinEnabled: classRecord.accessPinEnabled,
              reportingSystemIds: classRecord.reportingSystems.map(
                (system) => system.id,
              ),
            }}
          />
        </section>
      ) : null}

      {classRecord.status !== "open" ? (
        <section className="admin-section">
          <p className="eyebrow">Step 2: schedule</p>
          <h2>Class sessions</h2>
          <ul className="member-list">
            {classRecord.components.map((component) => (
              <li key={component.id} className="member-row">
                <span>{component.title ?? "Training session"}</span>
                <span>
                  {formatDepartmentDateTime(component.startsAt)} to{" "}
                  {formatDepartmentDateTime(component.endsAt)}
                </span>
                <Badge variant="outline">{component.creditedHours} hours</Badge>
                {isDraft ? (
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
                ) : null}
              </li>
            ))}
          </ul>
          {isDraft ? (
            <ComponentForm
              classId={classRecord.id}
              action={saveComponentAction}
              defaultStartsAt={newSessionStartsAt}
            />
          ) : null}
        </section>
      ) : null}

      {classRecord.status !== "open" ? (
        <section className="admin-section">
          <p className="eyebrow">Step 3: instructors and reporting</p>
          <h2>Instructor assignments</h2>
          <ul className="member-list">
            {classRecord.instructors.map((instructor) => (
              <li key={instructor.userId} className="member-row">
                <span>{instructor.displayName}</span>
                {instructor.isLead ? <Badge>Lead</Badge> : null}
              </li>
            ))}
          </ul>
          {isDraft ? (
            <form action={assignInstructorAction} className="inline-form">
              <input type="hidden" name="classId" value={classRecord.id} />
              <input type="hidden" name="isLead" value="true" />
              <select name="userId" className="select-input" required>
                {options.staff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">
                Set lead instructor
              </Button>
            </form>
          ) : null}
          <h2>Reporting systems</h2>
          <p>
            {classRecord.reportingSystems
              .map((system) => system.name)
              .join(", ") || "None selected"}
          </p>
        </section>
      ) : null}

      {classRecord.status !== "open" ? (
        <section className="admin-section">
          <p className="eyebrow">Step 4: review and access</p>
          <h2>Lifecycle</h2>
          <LifecycleControls
            classId={classRecord.id}
            status={classRecord.status}
            action={transitionClassAction}
          />
          <FinalizationControls
            classId={classRecord.id}
            status={classRecord.status}
            finalizeAction={finalizeClassAction}
            reopenAction={reopenClassAction}
          />
          {publicAccess && signInUrl && qrDataUrl ? (
            <TokenPanel
              accessPin={publicAccess.accessPin}
              qrDataUrl={qrDataUrl}
              signInUrl={signInUrl}
            />
          ) : null}
        </section>
      ) : null}
      {classRecord.status !== "open" && revisionHistory.length ? (
        <section className="admin-section">
          <p className="eyebrow">Finalization history</p>
          <h2>Immutable revisions</h2>
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
        </section>
      ) : null}
    </main>
  );
}

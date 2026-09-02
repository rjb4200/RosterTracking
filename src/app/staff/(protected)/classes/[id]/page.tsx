import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getClassDetail,
  listClassFormOptions,
} from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  formatDepartmentDateTimeInput,
} from "@/modules/classes/time";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  assignInstructorAction,
  rotateTokenAction,
  saveComponentAction,
  transitionClassAction,
  updateClassAction,
} from "../actions";
import { ClassForm } from "../class-form";
import { ComponentForm } from "../component-form";
import { LifecycleControls } from "../lifecycle-controls";
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
  const options = await listClassFormOptions(db);
  const isDraft = classRecord.status === "draft";

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
        </div>
      </div>

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
              reportingSystemIds: classRecord.reportingSystems.map(
                (system) => system.id,
              ),
            }}
          />
        </section>
      ) : null}

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
                    startsAt: formatDepartmentDateTimeInput(component.startsAt),
                    endsAt: formatDepartmentDateTimeInput(component.endsAt),
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
          />
        ) : null}
      </section>

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
                  {staff.displayName}
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

      <section className="admin-section">
        <p className="eyebrow">Step 4: review and access</p>
        <h2>Lifecycle</h2>
        <LifecycleControls
          classId={classRecord.id}
          status={classRecord.status}
          action={transitionClassAction}
        />
        {!["completed", "finalized", "cancelled"].includes(
          classRecord.status,
        ) ? (
          <TokenPanel classId={classRecord.id} action={rotateTokenAction} />
        ) : null}
      </section>
    </main>
  );
}

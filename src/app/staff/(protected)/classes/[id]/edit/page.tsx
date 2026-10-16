import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getClassDetail,
  listClassFormOptions,
} from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  formatDepartmentDateTimeInput,
  roundDepartmentDateTimeToQuarterHour,
} from "@/modules/classes/time";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  assignInstructorAction,
  saveComponentAction,
  updateClassAction,
} from "../../actions";
import { ClassForm } from "../../class-form";
import { ComponentForm } from "../../component-form";
import { InstructorAssignmentForm } from "../../instructor-assignment-form";

export const dynamic = "force-dynamic";

export default async function EditClassPage({
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
  if (["finalized", "cancelled"].includes(classRecord.status)) {
    redirect(`/staff/classes/${id}`);
  }
  const options = await listClassFormOptions(db, actor);
  const newSessionStartsAt = roundDepartmentDateTimeToQuarterHour(new Date());
  const componentKind = classRecord.reportingSystems.some(
    (system) => system.code === "fire",
  )
    ? "fire"
    : classRecord.reportingSystems.some((system) => system.code === "kbems")
      ? "ems"
      : undefined;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Edit class"
        title={classRecord.name ?? "Class"}
        actions={
          <Link
            href={`/staff/classes/${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to class
          </Link>
        }
      />

      <section className="admin-section">
        <h2>Class details</h2>
        <ClassForm
          action={updateClassAction}
          {...options}
          mtuActiveParticipantCount={classRecord.mtuActiveParticipantCount}
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
            objectives: classRecord.objectives,
            courseType: classRecord.courseType,
            courseNumber: classRecord.courseNumber,
            emsCategoryId: classRecord.emsCategoryId,
            mtuUsage: classRecord.mtuUsage,
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
              <Badge variant="outline">{component.creditedHours} hours</Badge>
              <ComponentForm
                classId={classRecord.id}
                action={saveComponentAction}
                trainingCodes={options.trainingCodes}
                trainingCodeKind={componentKind}
                curricula={options.curricula}
                curriculumChapters={options.curriculumChapters}
                recentCurriculumIds={options.recentCurriculumIds}
                component={{
                  id: component.id,
                  title: component.title,
                  creditedHours: component.creditedHours,
                  startsAt: formatDepartmentDateTimeInput(component.startsAt),
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
          defaultStartsAt={newSessionStartsAt}
          trainingCodes={options.trainingCodes}
          trainingCodeKind={componentKind}
          curricula={options.curricula}
          curriculumChapters={options.curriculumChapters}
          recentCurriculumIds={options.recentCurriculumIds}
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
        <InstructorAssignmentForm
          action={assignInstructorAction}
          classId={classRecord.id}
          staff={options.staff}
        />
      </section>
    </main>
  );
}

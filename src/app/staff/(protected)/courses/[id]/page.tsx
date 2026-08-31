import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { getCourse, listTrainingCodes } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { setCourseActiveAction, updateCourseAction } from "../actions";
import { CourseForm } from "../course-form";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.COURSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  const [course, trainingCodes] = await Promise.all([
    getCourse(db, id),
    listTrainingCodes(db, ""),
  ]);
  if (!course) notFound();

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{course.name}</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/courses"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          <form action={setCourseActiveAction}>
            <input type="hidden" name="id" value={course.id} />
            <input
              type="hidden"
              name="isActive"
              value={course.isActive ? "false" : "true"}
            />
            <Button
              type="submit"
              variant={course.isActive ? "destructive" : "secondary"}
            >
              {course.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit course</h2>
        <CourseForm
          trainingCodes={trainingCodes.map((code) => ({
            id: code.id,
            code: code.code,
            title: code.title,
          }))}
          action={updateCourseAction}
          submitLabel="Save changes"
          values={course}
        />
      </section>
    </main>
  );
}

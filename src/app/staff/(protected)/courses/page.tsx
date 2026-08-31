import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCourses, listTrainingCodes } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { createCourseAction } from "./actions";
import { CourseForm } from "./course-form";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.COURSES_MANAGE);
  const { q = "" } = await searchParams;
  const db = getDatabase();
  const [courses, trainingCodes] = await Promise.all([
    listCourses(db, q),
    listTrainingCodes(db, ""),
  ]);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Courses</h1>
        </div>
        <Link href="/staff/training-codes" className="back-link-plain">
          Training codes
        </Link>
      </div>

      <form className="search-bar" action="/staff/courses">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search course or training code"
          className="search-input"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Training code</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No courses found.
              </TableCell>
            </TableRow>
          ) : (
            courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <Link
                    href={`/staff/courses/${course.id}`}
                    className="row-link"
                  >
                    {course.name}
                  </Link>
                </TableCell>
                <TableCell>{course.trainingCode ?? "—"}</TableCell>
                <TableCell>{course.defaultHours ?? "—"}</TableCell>
                <TableCell>
                  {course.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <section className="admin-section">
        <h2>New course</h2>
        <CourseForm
          trainingCodes={trainingCodes.map((code) => ({
            id: code.id,
            code: code.code,
            title: code.title,
          }))}
          action={createCourseAction}
        />
      </section>
    </main>
  );
}

import Link from "next/link";

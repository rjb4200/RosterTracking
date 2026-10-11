import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createStudentAction } from "../actions";
import { StudentForm } from "../student-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requirePagePermission(PERMISSIONS.STUDENTS_MANAGE);

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title="New student"
        actions={
          <Link href="/staff/students" className="back-link-plain">
            Back to students
          </Link>
        }
      />
      <StudentForm action={createStudentAction} submitLabel="Create student" />
    </main>
  );
}

import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createStudentAction } from "../actions";
import { StudentForm } from "../student-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requirePagePermission(PERMISSIONS.STUDENTS_MANAGE);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">New student</h1>
        </div>
        <Link href="/staff/students" className="back-link-plain">
          Back to students
        </Link>
      </div>
      <StudentForm action={createStudentAction} submitLabel="Create student" />
    </main>
  );
}

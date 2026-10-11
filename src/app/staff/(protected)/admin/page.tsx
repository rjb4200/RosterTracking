import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { listOperationalClasses } from "@/modules/classes/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { resolveStaffWorkspace } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { OperationalClassSection } from "../operational-class-dashboard";

export default async function AdminWorkspacePage() {
  const staff = await getCurrentStaff();
  if (!staff || resolveStaffWorkspace(staff.roleCodes) !== "admin") {
    redirect("/staff");
  }
  const now = new Date();
  const [teaching, department] = await Promise.all([
    listOperationalClasses(getDatabase(), staff, "assigned", now),
    listOperationalClasses(getDatabase(), staff, "department", now),
  ]);
  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Training administration</p>
          <h1 className="staff-title">Command center</h1>
        </div>
        <Link
          href="/staff/classes/new"
          className={buttonVariants({ size: "lg" })}
        >
          Create class
        </Link>
      </div>
      <OperationalClassSection
        title="My teaching"
        classes={teaching}
        emptyTitle="No assigned teaching"
        emptyDescription="You are not on any class roster right now."
      />
      <OperationalClassSection
        title="Department overdue rosters"
        classes={department.filter((classRecord) => classRecord.isOverdue)}
        emptyTitle="No overdue rosters"
        emptyDescription="Every department roster is up to date."
      />
      <OperationalClassSection
        title="Department oversight"
        classes={department.filter((classRecord) => !classRecord.isOverdue)}
        emptyTitle="No classes need attention"
        emptyDescription="New or overdue department work will show here."
      />
    </main>
  );
}

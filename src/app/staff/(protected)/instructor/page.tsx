import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { listOperationalClasses } from "@/modules/classes/services";
import {
  formatDepartmentDateTime,
  getDepartmentCalendarDate,
} from "@/modules/classes/time";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { resolveStaffWorkspace } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { OperationalClassSection } from "../operational-class-dashboard";

export default async function InstructorWorkspacePage() {
  const staff = await getCurrentStaff();
  if (!staff || resolveStaffWorkspace(staff.roleCodes) !== "instructor") {
    redirect("/staff");
  }
  const now = new Date();
  const classes = await listOperationalClasses(
    getDatabase(),
    staff,
    "assigned",
    now,
  );
  const today = getDepartmentCalendarDate(now);
  const overdue = classes.filter((classRecord) => classRecord.isOverdue);
  const todayClasses = classes.filter(
    (classRecord) =>
      classRecord.firstSessionStartsAt &&
      getDepartmentCalendarDate(classRecord.firstSessionStartsAt) === today,
  );
  const upcoming = classes.filter(
    (classRecord) =>
      classRecord.firstSessionStartsAt &&
      classRecord.firstSessionStartsAt > now &&
      !classRecord.isOverdue,
  );
  const nextClass = upcoming[0];
  const nextClassDescription = nextClass?.firstSessionStartsAt
    ? `Your next class is ${nextClass.courseName} ${formatDepartmentDateTime(nextClass.firstSessionStartsAt)}.`
    : undefined;
  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Instructor workspace</p>
          <h1 className="staff-title">Class operations</h1>
        </div>
        <Link
          href="/staff/classes/new"
          className={buttonVariants({ size: "lg" })}
        >
          Create class
        </Link>
      </div>
      <OperationalClassSection
        title="Overdue rosters"
        classes={overdue}
        emptyTitle="No overdue rosters"
        emptyDescription="Nothing is awaiting finalization."
      />
      <OperationalClassSection
        title="Today"
        classes={todayClasses}
        emptyTitle="No classes today"
        emptyDescription={nextClassDescription}
      />
      <OperationalClassSection
        title="Upcoming"
        classes={upcoming}
        emptyTitle="No upcoming classes"
        emptyDescription="Schedule the next class to keep rosters moving."
        emptyAction={
          <Link
            href="/staff/classes/new"
            className={buttonVariants({ size: "sm" })}
          >
            Create class
          </Link>
        }
      />
    </main>
  );
}

import Link from "next/link";

import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { resolveStaffWorkspace } from "@/modules/staff-auth/workspaces";

export default async function InstructorWorkspacePage() {
  const staff = await getCurrentStaff();
  if (!staff || resolveStaffWorkspace(staff.roleCodes) !== "instructor") {
    redirect("/staff");
  }
  return (
    <main className="staff-content">
      <p className="eyebrow">Instructor workspace</p>
      <h1 className="staff-title">Class operations</h1>
      <p className="staff-intro">
        Create and manage your classes, open sign-in, display QR codes, and
        complete rosters.
      </p>
      <section className="foundation-grid">
        <article>
          <h2>My classes</h2>
          <p>Open current, completed, and archived classes you can access.</p>
          <Link href="/staff/classes">View classes</Link>
        </article>
        <article>
          <h2>New class</h2>
          <p>Create a class and prepare its participant sign-in workflow.</p>
          <Link href="/staff/classes/new">Create class</Link>
        </article>
      </section>
    </main>
  );
}

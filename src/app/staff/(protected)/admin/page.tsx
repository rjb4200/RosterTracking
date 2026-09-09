import Link from "next/link";

import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { resolveStaffWorkspace } from "@/modules/staff-auth/workspaces";

export default async function AdminWorkspacePage() {
  const staff = await getCurrentStaff();
  if (!staff || resolveStaffWorkspace(staff.roleCodes) !== "admin") {
    redirect("/staff");
  }
  return (
    <main className="staff-content">
      <p className="eyebrow">Training administration</p>
      <h1 className="staff-title">Command center</h1>
      <p className="staff-intro">
        Manage classes, reporting, finalized records, and department reference
        data.
      </p>
      <section className="foundation-grid">
        <article>
          <h2>Reporting</h2>
          <p>Review finalized classes and reporting work.</p>
          <Link href="/staff/reporting">Open reporting</Link>
        </article>
        <article>
          <h2>Classes</h2>
          <p>Manage active and historical class operations.</p>
          <Link href="/staff/classes">View classes</Link>
        </article>
        {staff.roleCodes.has("administrator") ? (
          <article>
            <h2>Staff accounts</h2>
            <p>Create and manage staff access.</p>
            <Link href="/staff/accounts">Manage accounts</Link>
          </article>
        ) : null}
      </section>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { isAdministrator } from "@/modules/staff-auth/workspaces";

import { AccountCreateForm } from "../account-create-form";

export const dynamic = "force-dynamic";

export default async function NewStaffAccountPage() {
  const staff = await getCurrentStaff();
  if (!staff || !isAdministrator(staff.roleCodes)) redirect("/staff");

  return (
    <main className="admin-content">
      <Link href="/staff/accounts" className="back-link-plain">
        Back to accounts
      </Link>
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="staff-title">New staff account</h1>
      </div>
      <section className="admin-section">
        <AccountCreateForm />
      </section>
    </main>
  );
}

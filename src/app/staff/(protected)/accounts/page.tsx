import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { listStaffAccounts } from "@/modules/staff-auth/staff-accounts";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { AccountControls } from "./account-controls";

export default async function StaffAccountsPage() {
  const staff = await getCurrentStaff();
  if (!staff || !isAdministrator(staff.roleCodes)) redirect("/staff");
  const accounts = await listStaffAccounts(getDatabase(), staff.id);
  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="staff-title">Staff accounts</h1>
        </div>
      </div>
      <AccountControls accounts={accounts} />
    </main>
  );
}

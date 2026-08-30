import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { hasPermission, PERMISSIONS } from "@/modules/staff-auth/permissions";

import { LogoutButton } from "../logout-button";

export const dynamic = "force-dynamic";

export default async function ProtectedStaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await getCurrentStaff();
  if (!staff || !hasPermission(staff.permissions, PERMISSIONS.STAFF_ACCESS)) {
    redirect("/staff/login");
  }

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <div>
          <span className="staff-brand">Roster Command</span>
          <span className="staff-user">{staff.displayName}</span>
        </div>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}

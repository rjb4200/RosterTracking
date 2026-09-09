import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import {
  resolveStaffWorkspace,
  workspaceHref,
} from "@/modules/staff-auth/workspaces";

export default async function StaffHomePage() {
  const staff = await getCurrentStaff();
  const workspace = staff ? resolveStaffWorkspace(staff.roleCodes) : null;
  if (!workspace) redirect("/staff/login");
  redirect(workspaceHref(workspace));
}

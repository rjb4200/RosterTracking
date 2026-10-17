import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import {
  EMAIL_PROMPT_COOKIE,
  shouldShowEmailPrompt,
} from "@/modules/staff-auth/email-prompt";
import {
  hasPermission,
  PERMISSIONS,
  ROLE_CODES,
} from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";

import { LogoutButton } from "../logout-button";
import { StaffEmailBand } from "./staff-email-band";

export const dynamic = "force-dynamic";

const navItems: Array<{ href: string; label: string; permission: string }> = [
  {
    href: "/staff/classes",
    label: "Classes",
    permission: PERMISSIONS.CLASSES_MANAGE,
  },
  {
    href: "/staff/accounts",
    label: "Staff accounts",
    permission: PERMISSIONS.STAFF_MANAGE,
  },
  {
    href: "/staff/students",
    label: "Students",
    permission: PERMISSIONS.STUDENTS_MANAGE,
  },
  {
    href: "/staff/agencies",
    label: "Agencies",
    permission: PERMISSIONS.AGENCIES_MANAGE,
  },
  {
    href: "/staff/training-codes",
    label: "Training categories",
    permission: PERMISSIONS.TRAINING_CODES_MANAGE,
  },
  {
    href: "/staff/curricula",
    label: "Curricula",
    permission: PERMISSIONS.CURRICULA_MANAGE,
  },
  {
    href: "/staff/sites",
    label: "Sites",
    permission: PERMISSIONS.SITES_MANAGE,
  },
  {
    href: "/staff/mtu-catalog",
    label: "MTU catalog",
    permission: PERMISSIONS.MTU_CATALOG_MANAGE,
  },
  {
    href: "/staff/reports",
    label: "Reports",
    permission: PERMISSIONS.REPORTING_MANAGE,
  },
  {
    href: "/staff/profile",
    label: "Profile",
    permission: PERMISSIONS.STAFF_ACCESS,
  },
];

export default async function ProtectedStaffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const staff = await getCurrentStaff();
  if (!staff || !hasPermission(staff.permissions, PERMISSIONS.STAFF_ACCESS)) {
    redirect("/staff/login");
  }
  const dismissedMarker =
    (await cookies()).get(EMAIL_PROMPT_COOKIE)?.value ?? null;
  const loginMarker = staff.lastLoginAt
    ? String(staff.lastLoginAt.getTime())
    : "";
  const showEmailPrompt = shouldShowEmailPrompt(
    staff.email,
    loginMarker,
    dismissedMarker,
  );

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <div>
          <span className="staff-brand">
            <Link href="/staff">Roster Command</Link>
          </span>
          <span className="staff-user">{staff.displayName}</span>
        </div>
        <LogoutButton />
      </header>
      {showEmailPrompt ? <StaffEmailBand loginMarker={loginMarker} /> : null}
      <nav className="admin-nav" aria-label="Staff sections">
        {navItems
          .filter(
            (item) =>
              staff.permissions.has(item.permission) &&
              (item.href !== "/staff/reports" ||
                isAdministrator(staff.roleCodes) ||
                staff.roleCodes.has(ROLE_CODES.TRAINING_MAJOR)) &&
              (item.href !== "/staff/accounts" ||
                isAdministrator(staff.roleCodes)),
          )
          .map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
      </nav>
      {children}
    </div>
  );
}

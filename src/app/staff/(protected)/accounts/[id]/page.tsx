import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { getStaffAccount } from "@/modules/staff-auth/staff-accounts";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { ProfileForm } from "../../profile/profile-form";
import { AccountDetailForm } from "../account-detail-form";
import { archiveAccountAction, profileAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function StaffAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await getCurrentStaff();
  if (!staff || !isAdministrator(staff.roleCodes)) redirect("/staff");
  const { id } = await params;
  const account = await getStaffAccount(getDatabase(), staff.id, id);
  if (!account) notFound();

  return (
    <main className="admin-content">
      <Link href="/staff/accounts" className="back-link-plain">
        Back to accounts
      </Link>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="staff-title">{account.displayName}</h1>
          <p>{account.username}</p>
        </div>
        <div className="admin-actions">
          <Badge variant={account.isActive ? "secondary" : "outline"}>
            {account.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <section className="admin-section">
        <h2>Account</h2>
        <AccountDetailForm account={account} />
        {account.id !== staff.id ? (
          <form action={archiveAccountAction} className="inline-form">
            <input type="hidden" name="userId" value={account.id} />
            <Button type="submit" variant="destructive">
              Archive account
            </Button>
          </form>
        ) : null}
      </section>

      <section className="admin-section">
        <h2>Instructor profile</h2>
        <ProfileForm
          idPrefix={`account-${account.id}`}
          action={profileAction}
          userId={account.id}
          values={account}
        />
      </section>
    </main>
  );
}

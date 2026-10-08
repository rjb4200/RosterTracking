import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { listStaffAccounts } from "@/modules/staff-auth/staff-accounts";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function StaffAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await getCurrentStaff();
  if (!staff || !isAdministrator(staff.roleCodes)) redirect("/staff");
  const { q = "" } = await searchParams;
  const accounts = await listStaffAccounts(getDatabase(), staff.id, q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="staff-title">Staff accounts</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/accounts/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            New staff account
          </Link>
        </div>
      </div>

      <form className="search-bar" action="/staff/accounts">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name or username"
          className="search-field"
        />
      </form>

      <Table className="reference-table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last login</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No staff accounts found.
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <Link
                    href={`/staff/accounts/${account.id}`}
                    className="row-link"
                  >
                    {account.displayName}
                  </Link>
                </TableCell>
                <TableCell>{account.username}</TableCell>
                <TableCell>{account.roleCodes[0] ?? "—"}</TableCell>
                <TableCell>
                  {account.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {account.lastLoginAt
                    ? formatDepartmentDateTime(account.lastLoginAt)
                    : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

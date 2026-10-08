import Link from "next/link";

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
import { listAgencies } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const { q = "" } = await searchParams;
  const agencies = await listAgencies(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Agencies</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/agencies/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            New agency
          </Link>
        </div>
      </div>

      <form className="search-bar" action="/staff/agencies">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search agencies"
          className="search-field"
        />
      </form>

      <Table className="reference-table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No agencies found.
              </TableCell>
            </TableRow>
          ) : (
            agencies.map((agency) => (
              <TableRow key={agency.id}>
                <TableCell>
                  <Link
                    href={`/staff/agencies/${agency.id}`}
                    className="row-link"
                  >
                    {agency.name}
                  </Link>
                </TableCell>
                <TableCell>{agency.type ?? "—"}</TableCell>
                <TableCell>{agency.city ?? "—"}</TableCell>
                <TableCell>
                  {agency.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

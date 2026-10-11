import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

import { TagBadgeList } from "./tag-badge";

export const dynamic = "force-dynamic";

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const { q = "" } = await searchParams;
  const agencies = await listAgencies(getDatabase(), q);
  const hasSearch = q.trim().length > 0;

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
            <TableHead>Tags</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <EmptyState
                  title={
                    hasSearch ? `No agencies match "${q}"` : "No agencies yet"
                  }
                  description={
                    hasSearch
                      ? "Try a different search, or clear it to see every agency."
                      : "Add your first agency to get started."
                  }
                  action={
                    hasSearch ? (
                      <Link
                        href="/staff/agencies"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Clear search
                      </Link>
                    ) : (
                      <Link
                        href="/staff/agencies/new"
                        className={buttonVariants({ size: "sm" })}
                      >
                        New agency
                      </Link>
                    )
                  }
                />
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
                <TableCell>
                  <TagBadgeList tags={agency.tags} />
                </TableCell>
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

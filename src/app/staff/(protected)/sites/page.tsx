import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSites } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.SITES_MANAGE);
  const { q = "" } = await searchParams;
  const sites = await listSites(getDatabase(), q);
  const hasSearch = q.trim().length > 0;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title="Training sites"
        primary={{ href: "/staff/sites/new", label: "New site" }}
      />

      <form className="search-bar" action="/staff/sites">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search sites"
          className="search-field"
        />
      </form>

      <Table className="reference-table">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <EmptyState
                  title={hasSearch ? `No sites match "${q}"` : "No sites yet"}
                  description={
                    hasSearch
                      ? "Try a different search, or clear it to see every site."
                      : "Add your first training site to get started."
                  }
                  action={
                    hasSearch ? (
                      <Link
                        href="/staff/sites"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Clear search
                      </Link>
                    ) : (
                      <Link
                        href="/staff/sites/new"
                        className={buttonVariants({ size: "sm" })}
                      >
                        New site
                      </Link>
                    )
                  }
                />
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell>
                  <Link href={`/staff/sites/${site.id}`} className="row-link">
                    {site.name}
                  </Link>
                </TableCell>
                <TableCell>{site.city ?? "—"}</TableCell>
                <TableCell>
                  <span className="class-status-cell">
                    {site.isDefault ? <Badge>Default</Badge> : null}
                    {site.isActive ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

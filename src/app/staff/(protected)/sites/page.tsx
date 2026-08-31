import { Badge } from "@/components/ui/badge";
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

import { createSiteAction } from "./actions";
import { SiteForm } from "./site-form";

export const dynamic = "force-dynamic";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.SITES_MANAGE);
  const { q = "" } = await searchParams;
  const sites = await listSites(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Training sites</h1>
        </div>
      </div>

      <form className="search-bar" action="/staff/sites">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search sites"
          className="search-input"
        />
      </form>

      <Table>
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
              <TableCell colSpan={3} className="text-muted-foreground">
                No sites found.
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
                  {site.isActive ? (
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

      <section className="admin-section">
        <h2>New site</h2>
        <SiteForm action={createSiteAction} />
      </section>
    </main>
  );
}

import Link from "next/link";

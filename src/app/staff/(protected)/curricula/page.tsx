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
import { listCurricula } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function CurriculaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.CURRICULA_MANAGE);
  const { q = "" } = await searchParams;
  const curricula = await listCurricula(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Curricula</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/curricula/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            New curriculum
          </Link>
        </div>
      </div>

      <form className="search-bar" action="/staff/curricula">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search publisher or program"
          className="search-field"
        />
      </form>

      <Table className="reference-table">
        <TableHeader>
          <TableRow>
            <TableHead>Publisher</TableHead>
            <TableHead>Program title</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Source revision</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {curricula.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No curricula found.
              </TableCell>
            </TableRow>
          ) : (
            curricula.map((curriculum) => (
              <TableRow key={curriculum.id}>
                <TableCell>{curriculum.publisher}</TableCell>
                <TableCell>
                  <Link
                    href={`/staff/curricula/${curriculum.id}`}
                    className="row-link"
                  >
                    {curriculum.programTitle}
                  </Link>
                </TableCell>
                <TableCell>{curriculum.version ?? "—"}</TableCell>
                <TableCell>{curriculum.sourceRevision}</TableCell>
                <TableCell>
                  {curriculum.isActive ? (
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

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
import { listTrainingCodes } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function TrainingCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.TRAINING_CODES_MANAGE);
  const { q = "" } = await searchParams;
  const codes = await listTrainingCodes(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Training codes</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/training-codes/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            New training code
          </Link>
        </div>
      </div>

      <form className="search-bar" action="/staff/training-codes">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search code or title"
          className="search-field"
        />
      </form>

      <Table className="reference-table">
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                No training codes found.
              </TableCell>
            </TableRow>
          ) : (
            codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <Link
                    href={`/staff/training-codes/${code.id}`}
                    className="row-link"
                  >
                    {code.code}
                  </Link>
                </TableCell>
                <TableCell>{code.title}</TableCell>
                <TableCell>
                  {code.isActive ? (
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

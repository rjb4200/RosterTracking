import Link from "next/link";

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
  await requirePagePermission(PERMISSIONS.COURSES_MANAGE);
  const { q = "" } = await searchParams;
  const codes = await listTrainingCodes(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Training codes</h1>
        </div>
        <Link href="/staff/courses" className="back-link-plain">
          Courses
        </Link>
      </div>

      <form className="search-bar" action="/staff/training-codes">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search code or title"
          className="search-input"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Source revision</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                No training codes found. Import a structured JSON file to add
                the catalog.
              </TableCell>
            </TableRow>
          ) : (
            codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>{code.code}</TableCell>
                <TableCell>{code.title}</TableCell>
                <TableCell>{code.sourceRevision}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

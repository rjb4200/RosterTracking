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
import { listClasses } from "@/modules/classes/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { q = "" } = await searchParams;
  const classes = await listClasses(getDatabase(), actor, q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Training operations</p>
          <h1 className="staff-title">Classes</h1>
        </div>
        <Link href="/staff/classes/new" className={buttonVariants()}>
          New class
        </Link>
      </div>
      <form className="search-bar" action="/staff/classes">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search course or site"
          className="search-input"
        />
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {classes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No classes found.
              </TableCell>
            </TableRow>
          ) : (
            classes.map((classRecord) => (
              <TableRow key={classRecord.id}>
                <TableCell>
                  <Link
                    href={`/staff/classes/${classRecord.id}`}
                    className="row-link"
                  >
                    {classRecord.courseName}
                  </Link>
                </TableCell>
                <TableCell>{classRecord.siteName ?? "Virtual"}</TableCell>
                <TableCell>
                  {classRecord.deliveryMethod.replace("_", " ")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      classRecord.status === "open" ? "default" : "secondary"
                    }
                  >
                    {classRecord.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

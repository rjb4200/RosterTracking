import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listStudents } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.STUDENTS_MANAGE);
  const { q = "" } = await searchParams;
  const students = await listStudents(getDatabase(), q);

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">Students</h1>
        </div>
        <Link href="/staff/students/new" className={buttonVariants()}>
          New student
        </Link>
      </div>

      <form className="search-bar" action="/staff/students">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, or number"
          className="search-input"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No students found.
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <Link
                    href={`/staff/students/${student.id}`}
                    className="row-link"
                  >
                    {student.lastName}, {student.firstName}
                  </Link>
                </TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>{student.studentNumber ?? "—"}</TableCell>
                <TableCell>
                  {student.isActive ? (
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

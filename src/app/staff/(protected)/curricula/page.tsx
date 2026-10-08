import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { archiveCurriculumAction, setCurriculumActiveAction } from "./actions";

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Publisher</TableHead>
            <TableHead>Program title</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Source revision</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {curricula.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No curricula found. Import the approved curriculum list to add
                the catalog.
              </TableCell>
            </TableRow>
          ) : (
            curricula.map((curriculum) => (
              <TableRow key={curriculum.id}>
                <TableCell>{curriculum.publisher}</TableCell>
                <TableCell>{curriculum.programTitle}</TableCell>
                <TableCell>{curriculum.version ?? "—"}</TableCell>
                <TableCell>{curriculum.sourceRevision}</TableCell>
                <TableCell>
                  {curriculum.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="inline-form">
                    <form action={setCurriculumActiveAction}>
                      <input type="hidden" name="id" value={curriculum.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={curriculum.isActive ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={
                          curriculum.isActive ? "destructive" : "secondary"
                        }
                      >
                        {curriculum.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </form>
                    <form action={archiveCurriculumAction}>
                      <input type="hidden" name="id" value={curriculum.id} />
                      <Button type="submit" variant="destructive">
                        Archive
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </main>
  );
}

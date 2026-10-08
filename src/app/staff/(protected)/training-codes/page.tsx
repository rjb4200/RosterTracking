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
import { listTrainingCodes } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveTrainingCodeAction,
  setTrainingCodeActiveAction,
} from "./actions";

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Source revision</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
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
                <TableCell>
                  {code.isActive ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="inline-form">
                    <form action={setTrainingCodeActiveAction}>
                      <input type="hidden" name="id" value={code.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={code.isActive ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={code.isActive ? "destructive" : "secondary"}
                      >
                        {code.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                    </form>
                    <form action={archiveTrainingCodeAction}>
                      <input type="hidden" name="id" value={code.id} />
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

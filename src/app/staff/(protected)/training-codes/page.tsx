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
  const hasSearch = q.trim().length > 0;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title="Training codes"
        primary={{
          href: "/staff/training-codes/new",
          label: "New training code",
        }}
      />

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
              <TableCell colSpan={3}>
                <EmptyState
                  title={
                    hasSearch
                      ? `No training codes match "${q}"`
                      : "No training codes yet"
                  }
                  description={
                    hasSearch
                      ? "Try a different search, or clear it to see every training code."
                      : "Add your first training code to get started."
                  }
                  action={
                    hasSearch ? (
                      <Link
                        href="/staff/training-codes"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Clear search
                      </Link>
                    ) : (
                      <Link
                        href="/staff/training-codes/new"
                        className={buttonVariants({ size: "sm" })}
                      >
                        New training code
                      </Link>
                    )
                  }
                />
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

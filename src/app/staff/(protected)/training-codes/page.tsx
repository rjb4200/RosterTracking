import Link from "next/link";

import { Fragment } from "react";

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
import { TRAINING_CATEGORY_KINDS } from "@/modules/reference/constants";
import { listTrainingCodes } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

type TrainingCode = Awaited<ReturnType<typeof listTrainingCodes>>[number];

function TrainingCodeTable({ codes }: { codes: TrainingCode[] }) {
  return (
    <Table className="reference-table">
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {codes.map((code, index) => {
          const startsCourseGroup =
            index > 0 &&
            codes[index - 1]?.categoryGroup === "core" &&
            code.categoryGroup !== "core";
          return (
            <Fragment key={code.id}>
              {startsCourseGroup ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <hr className="category-separator" />
                  </TableCell>
                </TableRow>
              ) : null}
              <TableRow>
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
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function TrainingCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.TRAINING_CODES_MANAGE);
  const { q = "" } = await searchParams;
  const db = getDatabase();
  const [fireCodes, emsCodes] = await Promise.all([
    listTrainingCodes(db, q, TRAINING_CATEGORY_KINDS.FIRE),
    listTrainingCodes(db, q, TRAINING_CATEGORY_KINDS.EMS),
  ]);
  const hasSearch = q.trim().length > 0;
  const isEmpty = fireCodes.length === 0 && emsCodes.length === 0;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title="Training categories"
        primary={{
          href: "/staff/training-codes/new",
          label: "New training category",
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

      {isEmpty ? (
        <EmptyState
          title={
            hasSearch
              ? `No training categories match "${q}"`
              : "No training categories yet"
          }
          description={
            hasSearch
              ? "Try a different search, or clear it to see every training category."
              : "Add your first training category to get started."
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
                New training category
              </Link>
            )
          }
        />
      ) : (
        <>
          <section className="admin-section">
            <h2>Fire</h2>
            {fireCodes.length === 0 ? (
              <p className="text-muted-foreground">
                No Fire categories match the search.
              </p>
            ) : (
              <TrainingCodeTable codes={fireCodes} />
            )}
          </section>
          <section className="admin-section">
            <h2>EMS</h2>
            {emsCodes.length === 0 ? (
              <p className="text-muted-foreground">
                No EMS categories match the search.
              </p>
            ) : (
              <TrainingCodeTable codes={emsCodes} />
            )}
          </section>
        </>
      )}
    </main>
  );
}

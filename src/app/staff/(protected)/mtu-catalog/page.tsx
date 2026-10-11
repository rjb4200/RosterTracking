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
import { listMtuCatalogItems } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

function ruleSummary(item: {
  perClassQty: string | null;
  perStudentQty: string | null;
  rounding: string | null;
  unitLabel: string | null;
}): string {
  const base = item.perClassQty ? Number(item.perClassQty) : 0;
  const rate = item.perStudentQty ? Number(item.perStudentQty) : 0;
  const parts: string[] = [];
  if (base > 0) parts.push(`${base} / class`);
  if (rate > 0) parts.push(`${rate} / student`);
  if (parts.length === 0) parts.push("No rule");
  const rounding = item.rounding === "exact" ? "exact" : "round up";
  return `${parts.join(" + ")} · ${rounding} · ${item.unitLabel ?? "—"}`;
}

function MtuEmptyState({
  kind,
  hasSearch,
  q,
}: {
  kind: string;
  hasSearch: boolean;
  q: string;
}) {
  return (
    <EmptyState
      title={hasSearch ? `No ${kind} match "${q}"` : `No ${kind} yet`}
      description={
        hasSearch
          ? "Try a different search, or clear it to see every entry."
          : `Add the first ${kind} entry to get started.`
      }
      action={
        hasSearch ? (
          <Link
            href="/staff/mtu-catalog"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Clear search
          </Link>
        ) : (
          <Link
            href="/staff/mtu-catalog/new"
            className={buttonVariants({ size: "sm" })}
          >
            New item
          </Link>
        )
      }
    />
  );
}

export default async function MtuCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.MTU_CATALOG_MANAGE);
  const { q = "" } = await searchParams;
  const hasSearch = q.trim().length > 0;
  const items = await listMtuCatalogItems(getDatabase(), q);
  const equipment = items.filter((item) => item.kind === "equipment");
  const supplies = items.filter((item) => item.kind === "supplies");
  const transport = items.filter((item) => item.kind === "transport");

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title="MTU catalog"
        primary={{ href: "/staff/mtu-catalog/new", label: "New item" }}
      />

      <form className="search-bar" action="/staff/mtu-catalog">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search MTU catalog"
          className="search-field"
        />
      </form>

      {hasSearch && items.length === 0 ? (
        <EmptyState
          title={`No MTU catalog entries match "${q}"`}
          description="Try a different search, or clear it to see every entry."
          action={
            <Link
              href="/staff/mtu-catalog"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Clear search
            </Link>
          }
        />
      ) : (
        <>
          <section className="admin-section">
            <h2>Equipment ({equipment.length})</h2>
            <Table className="reference-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <MtuEmptyState
                        kind="equipment"
                        hasSearch={hasSearch}
                        q={q}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/staff/mtu-catalog/${item.id}`}
                          className="row-link"
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
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
          </section>

          <section className="admin-section">
            <h2>Supplies ({supplies.length})</h2>
            <Table className="reference-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Expected usage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <MtuEmptyState
                        kind="supplies"
                        hasSearch={hasSearch}
                        q={q}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  supplies.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/staff/mtu-catalog/${item.id}`}
                          className="row-link"
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>{ruleSummary(item)}</TableCell>
                      <TableCell>
                        {item.isActive ? (
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
          </section>

          <section className="admin-section">
            <h2>Transport ({transport.length})</h2>
            <Table className="reference-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <MtuEmptyState
                        kind="transport"
                        hasSearch={hasSearch}
                        q={q}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  transport.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/staff/mtu-catalog/${item.id}`}
                          className="row-link"
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {item.requiresMileage ? "Required" : "Optional"}
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
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
          </section>
        </>
      )}
    </main>
  );
}

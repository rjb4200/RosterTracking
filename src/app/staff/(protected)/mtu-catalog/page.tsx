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

export default async function MtuCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePagePermission(PERMISSIONS.MTU_CATALOG_MANAGE);
  const { q = "" } = await searchParams;
  const items = await listMtuCatalogItems(getDatabase(), q);
  const equipment = items.filter((item) => item.kind === "equipment");
  const supplies = items.filter((item) => item.kind === "supplies");
  const transport = items.filter((item) => item.kind === "transport");

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">MTU catalog</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/mtu-catalog/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            New item
          </Link>
        </div>
      </div>

      <form className="search-bar" action="/staff/mtu-catalog">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search MTU catalog"
          className="search-field"
        />
      </form>

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
                <TableCell colSpan={2} className="text-muted-foreground">
                  No equipment found.
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
                <TableCell colSpan={3} className="text-muted-foreground">
                  No supplies found.
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
                <TableCell colSpan={3} className="text-muted-foreground">
                  No transport found.
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
    </main>
  );
}

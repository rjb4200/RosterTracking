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
import {
  CLASS_STATUSES,
  type ClassStatus,
  getClassStatusTone,
} from "@/modules/classes/constants";
import {
  CLASS_LIST_DEFAULT_LOOKBACK_DAYS,
  CLASS_LIST_FINALIZED_GRACE_DAYS,
  CLASS_LIST_LIMIT,
  listClasses,
} from "@/modules/classes/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const statusOptions = Object.values(CLASS_STATUSES);

const statusLabels: Record<ClassStatus, string> = {
  open: "Open",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

const toneVariant = {
  neutral: "secondary",
  info: "info",
  warning: "warning",
  success: "success",
  muted: "muted",
} as const;

type ClassListRow = Awaited<ReturnType<typeof listClasses>>[number];

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeDays(date: Date) {
  const days = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / DAY_IN_MILLISECONDS),
  );
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function ClassTable({ rows, empty }: { rows: ClassListRow[]; empty: string }) {
  if (!rows.length) {
    return <p className="text-muted-foreground">{empty}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="class-rail-head">
            <span className="sr-only">Status indicator</span>
          </TableHead>
          <TableHead>Class name</TableHead>
          <TableHead>Site</TableHead>
          <TableHead>Delivery</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((classRecord) => (
          <TableRow key={classRecord.id}>
            <TableCell className="class-rail-cell">
              <span
                className="class-status-rail"
                data-status={classRecord.status}
                aria-hidden="true"
              />
            </TableCell>
            <TableCell>
              <Link
                href={`/staff/classes/${classRecord.id}${classRecord.status === CLASS_STATUSES.FINALIZED ? "/review" : ""}`}
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
              <span className="class-status-cell">
                <Badge
                  variant={toneVariant[getClassStatusTone(classRecord.status)]}
                >
                  {classRecord.status}
                </Badge>
                {classRecord.isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : null}
                {classRecord.status === CLASS_STATUSES.FINALIZED &&
                classRecord.finalizedAt ? (
                  <span className="text-muted-foreground">
                    {formatRelativeDays(classRecord.finalizedAt)}
                  </span>
                ) : null}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    includeFinalized?: string;
    includeCancelled?: string;
  }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const query = await searchParams;

  const search = readSearchParam(query.q) ?? "";
  const statusParam = readSearchParam(query.status);
  const status = statusOptions.includes(statusParam as ClassStatus)
    ? (statusParam as ClassStatus)
    : undefined;

  const defaultFrom = toDateInputValue(
    new Date(
      Date.now() - CLASS_LIST_DEFAULT_LOOKBACK_DAYS * DAY_IN_MILLISECONDS,
    ),
  );
  const fromParam = readSearchParam(query.from);
  const fromValue = fromParam === undefined ? defaultFrom : fromParam;
  const toValue = readSearchParam(query.to) ?? "";
  const from = fromValue ? new Date(`${fromValue}T00:00:00`) : undefined;
  const to = toValue ? new Date(`${toValue}T23:59:59.999`) : undefined;
  const includeFinalized = readSearchParam(query.includeFinalized) === "on";
  const includeCancelled = readSearchParam(query.includeCancelled) === "on";

  const classes = await listClasses(getDatabase(), actor, {
    query: search,
    status,
    from,
    to,
    includeFinalized,
    includeCancelled,
  });

  const active = classes.filter(
    (classRecord) => classRecord.status !== CLASS_STATUSES.FINALIZED,
  );
  const finalized = classes
    .filter((classRecord) => classRecord.status === CLASS_STATUSES.FINALIZED)
    .sort(
      (left, right) =>
        (right.finalizedAt?.getTime() ?? 0) -
        (left.finalizedAt?.getTime() ?? 0),
    );

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
      <form className="inline-form class-list-filters" action="/staff/classes">
        <label htmlFor="classes-status">Status</label>
        <select
          id="classes-status"
          name="status"
          className="select-input"
          defaultValue={status ?? ""}
        >
          <option value="">Active</option>
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {statusLabels[option]}
            </option>
          ))}
        </select>
        <label htmlFor="classes-from">From</label>
        <input
          id="classes-from"
          type="date"
          name="from"
          className="search-input"
          defaultValue={fromValue}
        />
        <label htmlFor="classes-to">To</label>
        <input
          id="classes-to"
          type="date"
          name="to"
          className="search-input"
          defaultValue={toValue}
        />
        <label className="filter-toggle" htmlFor="classes-include-finalized">
          <input
            id="classes-include-finalized"
            type="checkbox"
            name="includeFinalized"
            defaultChecked={includeFinalized}
          />
          Include finalized
        </label>
        <label className="filter-toggle" htmlFor="classes-include-cancelled">
          <input
            id="classes-include-cancelled"
            type="checkbox"
            name="includeCancelled"
            defaultChecked={includeCancelled}
          />
          Include cancelled
        </label>
        <label className="sr-only" htmlFor="classes-search">
          Search class or site
        </label>
        <input
          id="classes-search"
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search class or site"
          className="search-field"
        />
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Apply filters
        </button>
      </form>
      {classes.length === CLASS_LIST_LIMIT ? (
        <p className="text-muted-foreground">
          Showing the first {CLASS_LIST_LIMIT} classes. Narrow the filters to
          see the rest.
        </p>
      ) : null}
      <section className="admin-section">
        <h2>Active</h2>
        <ClassTable rows={active} empty="No active classes found." />
      </section>
      {finalized.length ? (
        <section className="admin-section">
          <h2>
            {includeFinalized
              ? "Finalized"
              : `Recently finalized · last ${CLASS_LIST_FINALIZED_GRACE_DAYS} days`}
          </h2>
          <ClassTable rows={finalized} empty="No finalized classes found." />
        </section>
      ) : null}
    </main>
  );
}

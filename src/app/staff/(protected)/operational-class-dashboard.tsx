import { QrCode } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { listOperationalClasses } from "@/modules/classes/services";
import { formatDepartmentDateTime } from "@/modules/classes/time";

type OperationalClass = Awaited<
  ReturnType<typeof listOperationalClasses>
>[number];

function ClassCard({ classRecord }: { classRecord: OperationalClass }) {
  const detailHref = `/staff/classes/${classRecord.id}`;
  const reviewHref = `${detailHref}/review`;
  const action =
    classRecord.action === "roster"
      ? {
          href: classRecord.isOverdue ? reviewHref : detailHref,
          label: classRecord.isOverdue ? "Review and finalize" : "Open class",
        }
      : { href: reviewHref, label: "View class" };

  return (
    <article className="operational-class-card">
      <div className="operational-class-heading">
        <div>
          <h3>{classRecord.courseName}</h3>
          <p>{classRecord.siteName ?? "Virtual"}</p>
        </div>
        <Badge variant={classRecord.isOverdue ? "destructive" : "secondary"}>
          {classRecord.isOverdue ? "Overdue" : classRecord.status}
        </Badge>
      </div>
      <p className="operational-class-schedule">
        {classRecord.firstSessionStartsAt
          ? formatDepartmentDateTime(classRecord.firstSessionStartsAt)
          : "Schedule needed"}
      </p>
      <p className="operational-class-meta">
        {classRecord.attendanceCount} attendee
        {classRecord.attendanceCount === 1 ? "" : "s"}
        {classRecord.reportingDestinations.length
          ? ` · ${classRecord.reportingDestinations.join(", ")}`
          : " · No reporting destinations"}
      </p>
      <div className="operational-class-actions">
        <Link href={action.href} className={buttonVariants({ size: "sm" })}>
          {action.label}
        </Link>
        {classRecord.status === "open" ? (
          <Link
            href={`${detailHref}#student-access`}
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            aria-label="Display student sign-in QR code"
            title="Display student sign-in QR code"
          >
            <QrCode aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function OperationalClassSection({
  title,
  classes,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  title: string;
  classes: OperationalClass[];
  emptyTitle: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
}) {
  return (
    <section
      className="operational-section"
      aria-labelledby={title.toLowerCase().replaceAll(" ", "-")}
    >
      <h2 id={title.toLowerCase().replaceAll(" ", "-")}>{title}</h2>
      {classes.length ? (
        <div className="operational-class-grid">
          {classes.map((classRecord) => (
            <ClassCard key={classRecord.id} classRecord={classRecord} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}
    </section>
  );
}

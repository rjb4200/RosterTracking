import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type {
  ClassSignInRecordEntry,
  ClassSignInRecordRemovedEntry,
} from "@/modules/class-sign-in-record/pdf";
import { getClassSignInRecord } from "@/modules/class-sign-in-record/service";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function ClassSignInRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  const record = await getClassSignInRecord(db, actor, id);

  const renderEntry = (
    entry: ClassSignInRecordEntry | ClassSignInRecordRemovedEntry,
    removed = false,
  ) => (
    <li className="roster-row" key={entry.attendanceId}>
      <div>
        <strong>{entry.participantName}</strong>
        <span>
          {entry.participantType} | {entry.agencyName} | {entry.signInMethod} |{" "}
          {entry.creditedHours} hours
        </span>
        {entry.attestation ? (
          <span>
            Confirmed {formatDepartmentDateTime(entry.attestation.confirmedAt)}{" "}
            | {entry.attestation.originatingIp} | Device{" "}
            {entry.attestation.rememberedDeviceId ?? "none"}
          </span>
        ) : (
          <span>No attestation recorded.</span>
        )}
        {removed && "removedAt" in entry ? (
          <span>
            Removed {formatDepartmentDateTime(entry.removedAt)} by{" "}
            {entry.removedBy}: {entry.removalReason}
          </span>
        ) : null}
      </div>
      {entry.attestation ? (
        <blockquote className="attestation">
          {entry.attestation.renderedText}{" "}
          <small>(v{entry.attestation.textVersion})</small>
        </blockquote>
      ) : null}
    </li>
  );

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Sign-in record</p>
          <h1 className="staff-title">{record.courseName}</h1>
        </div>
        <div className="admin-actions">
          <Link
            href={`/staff/classes/${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Back to class
          </Link>
          <Link
            href={`/api/staff/class-sign-in-record/${id}?disposition=inline`}
            target="_blank"
            className={buttonVariants({ variant: "secondary" })}
          >
            Print record
          </Link>
          <Link
            href={`/api/staff/class-sign-in-record/${id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Download record
          </Link>
        </div>
      </div>
      <section className="admin-section">
        <p className="roster-note">
          {record.siteName ?? "Online"} |{" "}
          {record.deliveryMethod.replace("_", " ")} | Host agency:{" "}
          {record.hostAgencyName}
        </p>
        <p className="roster-note">
          Generated {formatDepartmentDateTime(record.generatedAt)}
        </p>
        <h2>Active attendance ({record.active.length})</h2>
        <ul className="roster-list">
          {record.active.map((entry) => renderEntry(entry))}
        </ul>
      </section>
      <section className="admin-section">
        <h2>Removed attendance ({record.removed.length})</h2>
        <ul className="roster-list">
          {record.removed.map((entry) => renderEntry(entry, true))}
        </ul>
      </section>
    </main>
  );
}

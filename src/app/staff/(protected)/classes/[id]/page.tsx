import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  buildClassSignInUrl,
  createClassQrDataUrl,
} from "@/modules/classes/qr";
import {
  getClassDetail,
  getClassPublicAccess,
} from "@/modules/classes/services";
import { formatDepartmentDateTime } from "@/modules/classes/time";
import { getClassRosterRefresh } from "@/modules/instructor-roster/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { correctCredentialAction, transitionClassAction } from "../actions";
import { ClassSummary } from "../class-summary";
import { LifecycleControls } from "../lifecycle-controls";
import { LiveRoster } from "../live-roster";
import { TokenPanel } from "../token-panel";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  let classRecord: Awaited<ReturnType<typeof getClassDetail>>;
  try {
    classRecord = await getClassDetail(db, actor, id);
  } catch {
    notFound();
  }
  if (classRecord.status === "finalized")
    redirect(`/staff/classes/${id}/review`);
  const isOpen = classRecord.status === "open";
  const [rosterRefresh, publicAccess] = await Promise.all([
    isOpen ? getClassRosterRefresh(db, actor, id) : null,
    isOpen ? getClassPublicAccess(db, actor, id) : null,
  ]);
  const signInUrl = publicAccess
    ? buildClassSignInUrl(publicAccess.publicCode)
    : null;
  const qrDataUrl = signInUrl ? await createClassQrDataUrl(signInUrl) : null;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Class"
        title={classRecord.name ?? "Class"}
        meta={
          <p>
            {classRecord.site?.name ?? "Online"} |{" "}
            {classRecord.deliveryMethod.replace("_", " ")} |{" "}
            {classRecord.components[0]
              ? formatDepartmentDateTime(classRecord.components[0].startsAt)
              : "No session scheduled"}
          </p>
        }
        actions={
          <>
            <Badge variant={isOpen ? "default" : "secondary"}>
              {classRecord.status}
            </Badge>
            <Link
              href="/staff/classes"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
          </>
        }
      />
      {isOpen ? (
        <section className="admin-section">
          <LifecycleControls
            classId={id}
            status={classRecord.status}
            action={transitionClassAction}
          />
        </section>
      ) : null}
      {isOpen && rosterRefresh ? (
        <section className="admin-section class-command-screen">
          <LiveRoster
            classId={id}
            hostAgencyName={classRecord.hostAgency?.name ?? "Not set"}
            initialRoster={rosterRefresh}
            correctionAction={correctCredentialAction}
            tokenPanel={
              publicAccess && signInUrl && qrDataUrl ? (
                <TokenPanel
                  accessPin={publicAccess.accessPin}
                  qrDataUrl={qrDataUrl}
                  signInUrl={signInUrl}
                />
              ) : null
            }
          />
        </section>
      ) : null}
      <section className="admin-section">
        <PageHeading
          titleAs="h2"
          title="Class details"
          actions={
            isOpen ? (
              <Link
                href={`/staff/classes/${id}/edit`}
                className={buttonVariants({ variant: "secondary" })}
              >
                Edit class details
              </Link>
            ) : null
          }
        />
        <ClassSummary classRecord={classRecord} />
      </section>
    </main>
  );
}

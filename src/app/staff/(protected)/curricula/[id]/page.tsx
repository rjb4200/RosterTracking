import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { getCurriculum } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveCurriculumAction,
  setCurriculumActiveAction,
  updateCurriculumAction,
} from "../actions";
import { CurriculumForm } from "../curriculum-form";

export const dynamic = "force-dynamic";

export default async function CurriculumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.CURRICULA_MANAGE);
  const { id } = await params;
  const curriculum = await getCurriculum(getDatabase(), id);
  if (!curriculum) notFound();

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{curriculum.programTitle}</h1>
          <p>{curriculum.publisher}</p>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/curricula"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          <form action={setCurriculumActiveAction}>
            <input type="hidden" name="id" value={curriculum.id} />
            <input
              type="hidden"
              name="isActive"
              value={curriculum.isActive ? "false" : "true"}
            />
            <Button
              type="submit"
              variant={curriculum.isActive ? "destructive" : "secondary"}
            >
              {curriculum.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
          {!curriculum.archivedAt ? (
            <form action={archiveCurriculumAction}>
              <input type="hidden" name="id" value={curriculum.id} />
              <Button type="submit" variant="destructive">
                Archive
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit curriculum</h2>
        <CurriculumForm
          action={updateCurriculumAction}
          submitLabel="Save changes"
          values={{
            id: curriculum.id,
            publisher: curriculum.publisher,
            programTitle: curriculum.programTitle,
            version: curriculum.version,
            additionalRequirements: curriculum.additionalRequirements,
            sourceRevision: curriculum.sourceRevision,
          }}
        />
      </section>
    </main>
  );
}

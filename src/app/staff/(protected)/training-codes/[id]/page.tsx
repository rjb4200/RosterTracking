import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getTrainingCode,
  listTrainingCategoryOptions,
} from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveTrainingCodeAction,
  setTrainingCodeActiveAction,
  updateTrainingCodeAction,
} from "../actions";
import { TrainingCodeForm } from "../training-code-form";

export const dynamic = "force-dynamic";

export default async function TrainingCodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.TRAINING_CODES_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  const code = await getTrainingCode(db, id);
  if (!code) notFound();
  const categories = await listTrainingCategoryOptions(db);

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title={code.code}
        actions={
          <>
            <Link
              href="/staff/training-codes"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
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
            {!code.archivedAt ? (
              <form action={archiveTrainingCodeAction}>
                <input type="hidden" name="id" value={code.id} />
                <Button type="submit" variant="destructive">
                  Archive
                </Button>
              </form>
            ) : null}
          </>
        }
      />
      <section className="admin-section">
        <h2>Edit training category</h2>
        <TrainingCodeForm
          action={updateTrainingCodeAction}
          submitLabel="Save changes"
          categories={categories}
          values={{
            id: code.id,
            kind: code.kind,
            code: code.code,
            title: code.title,
            isPinned: code.isPinned,
            mapsToId: code.mapsToId,
          }}
        />
      </section>
    </main>
  );
}

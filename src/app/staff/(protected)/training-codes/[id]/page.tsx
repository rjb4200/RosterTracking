import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { getTrainingCode } from "@/modules/reference/services";
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
  const code = await getTrainingCode(getDatabase(), id);
  if (!code) notFound();

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{code.code}</h1>
        </div>
        <div className="admin-actions">
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
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit training code</h2>
        <TrainingCodeForm
          action={updateTrainingCodeAction}
          submitLabel="Save changes"
          values={{
            id: code.id,
            code: code.code,
            title: code.title,
          }}
        />
      </section>
    </main>
  );
}

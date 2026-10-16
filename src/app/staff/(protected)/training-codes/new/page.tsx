import Link from "next/link";

import { listTrainingCategoryOptions } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { createTrainingCodeAction } from "../actions";
import { TrainingCodeForm } from "../training-code-form";

export const dynamic = "force-dynamic";

export default async function NewTrainingCodePage() {
  await requirePagePermission(PERMISSIONS.TRAINING_CODES_MANAGE);
  const categories = await listTrainingCategoryOptions(getDatabase());

  return (
    <main className="admin-content">
      <Link href="/staff/training-codes" className="back-link-plain">
        Back to training categories
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New training category</h1>
      </div>
      <section className="admin-section">
        <TrainingCodeForm
          action={createTrainingCodeAction}
          categories={categories}
        />
      </section>
    </main>
  );
}

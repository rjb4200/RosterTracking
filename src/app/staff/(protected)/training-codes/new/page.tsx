import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createTrainingCodeAction } from "../actions";
import { TrainingCodeForm } from "../training-code-form";

export const dynamic = "force-dynamic";

export default async function NewTrainingCodePage() {
  await requirePagePermission(PERMISSIONS.TRAINING_CODES_MANAGE);

  return (
    <main className="admin-content">
      <Link href="/staff/training-codes" className="back-link-plain">
        Back to training codes
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New training code</h1>
      </div>
      <section className="admin-section">
        <TrainingCodeForm action={createTrainingCodeAction} />
      </section>
    </main>
  );
}

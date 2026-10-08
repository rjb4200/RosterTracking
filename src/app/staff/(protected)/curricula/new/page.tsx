import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createCurriculumAction } from "../actions";
import { CurriculumForm } from "../curriculum-form";

export const dynamic = "force-dynamic";

export default async function NewCurriculumPage() {
  await requirePagePermission(PERMISSIONS.CURRICULA_MANAGE);

  return (
    <main className="admin-content">
      <Link href="/staff/curricula" className="back-link-plain">
        Back to curricula
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New curriculum</h1>
      </div>
      <section className="admin-section">
        <CurriculumForm action={createCurriculumAction} />
      </section>
    </main>
  );
}

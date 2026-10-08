import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createAgencyAction } from "../actions";
import { AgencyForm } from "../agency-form";

export const dynamic = "force-dynamic";

export default async function NewAgencyPage() {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);

  return (
    <main className="admin-content">
      <Link href="/staff/agencies" className="back-link-plain">
        Back to agencies
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New agency</h1>
      </div>
      <section className="admin-section">
        <AgencyForm action={createAgencyAction} />
      </section>
    </main>
  );
}

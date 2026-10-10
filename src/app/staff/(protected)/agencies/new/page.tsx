import Link from "next/link";

import { listAgencyTags } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { createAgencyAction } from "../actions";
import { AgencyForm } from "../agency-form";

export const dynamic = "force-dynamic";

export default async function NewAgencyPage() {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const tags = await listAgencyTags(getDatabase());

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
        <AgencyForm action={createAgencyAction} tags={tags} />
      </section>
    </main>
  );
}

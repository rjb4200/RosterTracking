import Link from "next/link";

import { getDefaultAgency, listAgencyTags } from "@/modules/reference/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { createAgencyAction } from "../actions";
import { AgencyForm } from "../agency-form";

export const dynamic = "force-dynamic";

export default async function NewAgencyPage() {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const database = getDatabase();
  const staff = await getCurrentStaff();
  const canSetDefault = Boolean(staff && isAdministrator(staff.roleCodes));
  const [tags, defaultAgency] = await Promise.all([
    listAgencyTags(database),
    canSetDefault ? getDefaultAgency(database) : Promise.resolve(null),
  ]);

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
        <AgencyForm
          action={createAgencyAction}
          tags={tags}
          canSetDefault={canSetDefault}
          currentDefaultName={defaultAgency?.name ?? null}
        />
      </section>
    </main>
  );
}

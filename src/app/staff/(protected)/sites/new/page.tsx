import Link from "next/link";

import { getDefaultSite } from "@/modules/reference/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import { createSiteAction } from "../actions";
import { SiteForm } from "../site-form";

export const dynamic = "force-dynamic";

export default async function NewSitePage() {
  await requirePagePermission(PERMISSIONS.SITES_MANAGE);
  const staff = await getCurrentStaff();
  const canSetDefault = Boolean(staff && isAdministrator(staff.roleCodes));
  const defaultSite = canSetDefault
    ? await getDefaultSite(getDatabase())
    : null;

  return (
    <main className="admin-content">
      <Link href="/staff/sites" className="back-link-plain">
        Back to sites
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New site</h1>
      </div>
      <section className="admin-section">
        <SiteForm
          action={createSiteAction}
          canSetDefault={canSetDefault}
          currentDefaultName={defaultSite?.name ?? null}
        />
      </section>
    </main>
  );
}

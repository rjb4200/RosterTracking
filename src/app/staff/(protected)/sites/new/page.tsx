import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createSiteAction } from "../actions";
import { SiteForm } from "../site-form";

export const dynamic = "force-dynamic";

export default async function NewSitePage() {
  await requirePagePermission(PERMISSIONS.SITES_MANAGE);

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
        <SiteForm action={createSiteAction} />
      </section>
    </main>
  );
}

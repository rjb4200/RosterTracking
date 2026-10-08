import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { getSite } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveSiteAction,
  setSiteActiveAction,
  updateSiteAction,
} from "../actions";
import { SiteForm } from "../site-form";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.SITES_MANAGE);
  const { id } = await params;
  const site = await getSite(getDatabase(), id);
  if (!site) notFound();

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{site.name}</h1>
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/sites"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
          <form action={setSiteActiveAction}>
            <input type="hidden" name="id" value={site.id} />
            <input
              type="hidden"
              name="isActive"
              value={site.isActive ? "false" : "true"}
            />
            <Button
              type="submit"
              variant={site.isActive ? "destructive" : "secondary"}
            >
              {site.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
          {!site.archivedAt ? (
            <form action={archiveSiteAction}>
              <input type="hidden" name="id" value={site.id} />
              <Button type="submit" variant="destructive">
                Archive
              </Button>
            </form>
          ) : null}
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit site</h2>
        <SiteForm
          action={updateSiteAction}
          submitLabel="Save changes"
          values={site}
        />
      </section>
    </main>
  );
}

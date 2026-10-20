import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getDefaultSite, getSite } from "@/modules/reference/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
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
  const database = getDatabase();
  const site = await getSite(database, id);
  if (!site) notFound();
  const staff = await getCurrentStaff();
  const canSetDefault = Boolean(staff && isAdministrator(staff.roleCodes));
  const defaultSite = canSetDefault ? await getDefaultSite(database) : null;

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title={site.name}
        actions={
          <>
            <Link
              href="/staff/sites"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
            {site.isDefault ? (
              <p className="text-muted-foreground">
                Clear the default setting before deactivating or archiving this
                site.
              </p>
            ) : (
              <>
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
              </>
            )}
          </>
        }
      />
      <section className="admin-section">
        <h2>Edit site</h2>
        <SiteForm
          action={updateSiteAction}
          submitLabel="Save changes"
          values={site}
          canSetDefault={canSetDefault}
          currentDefaultName={defaultSite?.name ?? null}
          isCurrentDefault={site.isDefault}
        />
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { AGENCY_TAG_CODES } from "@/modules/reference/constants";
import {
  getAgency,
  getDefaultAgency,
  listAgencyTags,
} from "@/modules/reference/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { isAdministrator } from "@/modules/staff-auth/workspaces";
import { getDatabase } from "@/server/db/client";

import {
  archiveAgencyAction,
  setAgencyActiveAction,
  updateAgencyAction,
} from "../actions";
import { AgencyForm } from "../agency-form";
import { TagBadgeList } from "../tag-badge";

export const dynamic = "force-dynamic";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const { id } = await params;
  const database = getDatabase();
  const staff = await getCurrentStaff();
  const canSetDefault = Boolean(staff && isAdministrator(staff.roleCodes));
  const [agency, tags, defaultAgency] = await Promise.all([
    getAgency(database, id),
    listAgencyTags(database),
    canSetDefault ? getDefaultAgency(database) : Promise.resolve(null),
  ]);
  if (!agency) notFound();

  const values = {
    id: agency.id,
    name: agency.name,
    address: agency.address,
    city: agency.city,
    state: agency.state,
    zip: agency.zip,
    contactName: agency.contactName,
    phone: agency.phone,
    email: agency.email,
    trainingCoordinatorName: agency.trainingCoordinatorName,
    trainingCoordinatorPhone: agency.trainingCoordinatorPhone,
    trainingCoordinatorEmail: agency.trainingCoordinatorEmail,
    tagIds: agency.tags.map((tag) => tag.id),
    otherSubtype:
      agency.tags.find((tag) => tag.code === AGENCY_TAG_CODES.OTHER)?.subtype ??
      null,
    isActive: agency.isActive,
    isDefault: agency.isDefault,
  };

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title={agency.name}
        meta={<TagBadgeList tags={agency.tags} />}
        actions={
          <>
            <Link
              href="/staff/agencies"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
            {agency.isDefault ? (
              <p className="text-muted-foreground">
                Clear the default setting before deactivating or archiving this
                agency.
              </p>
            ) : (
              <>
                <form action={setAgencyActiveAction}>
                  <input type="hidden" name="id" value={agency.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={agency.isActive ? "false" : "true"}
                  />
                  <Button
                    type="submit"
                    variant={agency.isActive ? "destructive" : "secondary"}
                  >
                    {agency.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </form>
                {!agency.archivedAt ? (
                  <form action={archiveAgencyAction}>
                    <input type="hidden" name="id" value={agency.id} />
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
        <h2>Edit agency</h2>
        <AgencyForm
          action={updateAgencyAction}
          submitLabel="Save changes"
          tags={tags}
          values={values}
          canSetDefault={canSetDefault}
          currentDefaultName={defaultAgency?.name ?? null}
          isCurrentDefault={agency.isDefault}
        />
      </section>
    </main>
  );
}

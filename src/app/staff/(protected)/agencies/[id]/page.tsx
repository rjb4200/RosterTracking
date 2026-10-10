import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { AGENCY_TAG_CODES } from "@/modules/reference/constants";
import { getAgency, listAgencyTags } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
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
  const [agency, tags] = await Promise.all([
    getAgency(database, id),
    listAgencyTags(database),
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
  };

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{agency.name}</h1>
          <TagBadgeList tags={agency.tags} />
        </div>
        <div className="admin-actions">
          <Link
            href="/staff/agencies"
            className={buttonVariants({ variant: "outline" })}
          >
            Back
          </Link>
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
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit agency</h2>
        <AgencyForm
          action={updateAgencyAction}
          submitLabel="Save changes"
          tags={tags}
          values={values}
        />
      </section>
    </main>
  );
}

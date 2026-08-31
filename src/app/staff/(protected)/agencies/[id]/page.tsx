import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { getAgency } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { setAgencyActiveAction, updateAgencyAction } from "../actions";
import { AgencyForm } from "../agency-form";

export const dynamic = "force-dynamic";

export default async function AgencyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.AGENCIES_MANAGE);
  const { id } = await params;
  const agency = await getAgency(getDatabase(), id);
  if (!agency) notFound();

  return (
    <main className="admin-content">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Reference data</p>
          <h1 className="staff-title">{agency.name}</h1>
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
        </div>
      </div>
      <section className="admin-section">
        <h2>Edit agency</h2>
        <AgencyForm
          action={updateAgencyAction}
          submitLabel="Save changes"
          values={agency}
        />
      </section>
    </main>
  );
}

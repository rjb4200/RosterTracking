import Link from "next/link";

import { listClassFormOptions } from "@/modules/classes/services";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { createInlineSiteAction, createScheduledClassAction } from "../actions";
import { ClassCreationWizard } from "../class-creation-wizard";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  const actor = await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const staff = await getCurrentStaff();
  const options = await listClassFormOptions(getDatabase(), actor);
  return (
    <main className="admin-content">
      <Link href="/staff/classes" className="back-link-plain">
        Back to classes
      </Link>
      <div>
        <p className="eyebrow">Guided class setup</p>
        <h1 className="staff-title">Create a class</h1>
      </div>
      <ClassCreationWizard
        action={createScheduledClassAction}
        createSiteAction={createInlineSiteAction}
        defaultLeadInstructorId={actor.id}
        canCreateSite={Boolean(
          staff?.permissions.has(PERMISSIONS.SITES_CREATE),
        )}
        {...options}
      />
    </main>
  );
}

import Link from "next/link";

import { listClassFormOptions } from "@/modules/classes/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import { createClassAction } from "../actions";
import { ClassForm } from "../class-form";

export const dynamic = "force-dynamic";

export default async function NewClassPage() {
  await requirePagePermission(PERMISSIONS.CLASSES_MANAGE);
  const options = await listClassFormOptions(getDatabase());
  return (
    <main className="admin-content">
      <Link href="/staff/classes" className="back-link-plain">
        Back to classes
      </Link>
      <div>
        <p className="eyebrow">Step 1 of 4: class setup</p>
        <h1 className="staff-title">Create class draft</h1>
      </div>
      <ClassForm action={createClassAction} {...options} />
    </main>
  );
}

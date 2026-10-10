import Link from "next/link";

import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";

import { createMtuCatalogItemAction } from "../actions";
import { MtuItemForm } from "../mtu-item-form";

export const dynamic = "force-dynamic";

export default async function NewMtuCatalogItemPage() {
  await requirePagePermission(PERMISSIONS.MTU_CATALOG_MANAGE);

  return (
    <main className="admin-content">
      <Link href="/staff/mtu-catalog" className="back-link-plain">
        Back to MTU catalog
      </Link>
      <div>
        <p className="eyebrow">Reference data</p>
        <h1 className="staff-title">New MTU catalog item</h1>
      </div>
      <section className="admin-section">
        <MtuItemForm action={createMtuCatalogItemAction} />
      </section>
    </main>
  );
}

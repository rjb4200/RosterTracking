import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getMtuCatalogItem } from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveMtuCatalogItemAction,
  setMtuCatalogItemActiveAction,
  updateMtuCatalogItemAction,
} from "../actions";
import { MtuItemForm } from "../mtu-item-form";

export const dynamic = "force-dynamic";

export default async function MtuCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.MTU_CATALOG_MANAGE);
  const { id } = await params;
  const item = await getMtuCatalogItem(getDatabase(), id);
  if (!item) notFound();

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title={item.name}
        actions={
          <>
            <Link
              href="/staff/mtu-catalog"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
            <form action={setMtuCatalogItemActiveAction}>
              <input type="hidden" name="id" value={item.id} />
              <input
                type="hidden"
                name="isActive"
                value={item.isActive ? "false" : "true"}
              />
              <Button
                type="submit"
                variant={item.isActive ? "destructive" : "secondary"}
              >
                {item.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </form>
            {!item.archivedAt ? (
              <form action={archiveMtuCatalogItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="destructive">
                  Archive
                </Button>
              </form>
            ) : null}
          </>
        }
      />
      <section className="admin-section">
        <h2>Edit item</h2>
        <MtuItemForm
          action={updateMtuCatalogItemAction}
          submitLabel="Save changes"
          values={item}
        />
      </section>
    </main>
  );
}

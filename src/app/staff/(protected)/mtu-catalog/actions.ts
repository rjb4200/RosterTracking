"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import * as reference from "@/modules/reference/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface MtuCatalogActionState {
  error?: string;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

function readItemForm(formData: FormData): reference.MtuCatalogItemInput {
  return {
    kind: read(formData, "kind"),
    name: read(formData, "name"),
    unitLabel: read(formData, "unitLabel"),
    perClassQty: read(formData, "perClassQty"),
    perStudentQty: read(formData, "perStudentQty"),
    rounding: read(formData, "rounding"),
    sortOrder: read(formData, "sortOrder"),
  };
}

export async function createMtuCatalogItemAction(
  _prev: MtuCatalogActionState | undefined,
  formData: FormData,
): Promise<MtuCatalogActionState> {
  const actor = await requireActor(PERMISSIONS.MTU_CATALOG_MANAGE);
  try {
    await reference.createMtuCatalogItem(
      getDatabase(),
      actor,
      readItemForm(formData),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create item.",
    };
  }
  revalidatePath("/staff/mtu-catalog");
  redirect("/staff/mtu-catalog");
}

export async function updateMtuCatalogItemAction(
  _prev: MtuCatalogActionState | undefined,
  formData: FormData,
): Promise<MtuCatalogActionState> {
  const actor = await requireActor(PERMISSIONS.MTU_CATALOG_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateMtuCatalogItem(
      getDatabase(),
      actor,
      id,
      readItemForm(formData),
    );
    revalidatePath(`/staff/mtu-catalog/${id}`);
    revalidatePath("/staff/mtu-catalog");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save item.",
    };
  }
}

export async function setMtuCatalogItemActiveAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.MTU_CATALOG_MANAGE);
  const id = read(formData, "id");
  await reference.setMtuCatalogItemActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/mtu-catalog/${id}`);
  revalidatePath("/staff/mtu-catalog");
}

export async function archiveMtuCatalogItemAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.MTU_CATALOG_MANAGE);
  const id = read(formData, "id");
  await reference.archiveMtuCatalogItem(getDatabase(), actor, id);
  revalidatePath("/staff/mtu-catalog");
  redirect("/staff/mtu-catalog");
}

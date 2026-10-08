"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import * as reference from "@/modules/reference/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ActionState {
  error?: string;
}

function read(formData: FormData, key: string): string {
  return formData.get(key)?.toString() ?? "";
}

export async function createSiteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.SITES_MANAGE);
  try {
    await reference.createSite(getDatabase(), actor, {
      name: read(formData, "name"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create site.",
    };
  }
  revalidatePath("/staff/sites");
  redirect("/staff/sites");
}

export async function updateSiteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.SITES_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateSite(getDatabase(), actor, id, {
      name: read(formData, "name"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
    });
    revalidatePath(`/staff/sites/${id}`);
    revalidatePath("/staff/sites");
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update site.",
    };
  }
}

export async function setSiteActiveAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.SITES_MANAGE);
  const id = read(formData, "id");
  await reference.setSiteActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/sites/${id}`);
  revalidatePath("/staff/sites");
}

export async function archiveSiteAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.SITES_MANAGE);
  const id = read(formData, "id");
  await reference.archiveSite(getDatabase(), actor, id);
  revalidatePath("/staff/sites");
  redirect("/staff/sites");
}

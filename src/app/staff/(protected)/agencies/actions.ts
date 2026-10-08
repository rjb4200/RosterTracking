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

export async function createAgencyAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.AGENCIES_MANAGE);
  try {
    await reference.createAgency(getDatabase(), actor, {
      name: read(formData, "name"),
      type: read(formData, "type"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
      contactName: read(formData, "contactName"),
      phone: read(formData, "phone"),
      email: read(formData, "email"),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create agency.",
    };
  }
  revalidatePath("/staff/agencies");
  redirect("/staff/agencies");
}

export async function updateAgencyAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.AGENCIES_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateAgency(getDatabase(), actor, id, {
      name: read(formData, "name"),
      type: read(formData, "type"),
      address: read(formData, "address"),
      city: read(formData, "city"),
      state: read(formData, "state"),
      zip: read(formData, "zip"),
      contactName: read(formData, "contactName"),
      phone: read(formData, "phone"),
      email: read(formData, "email"),
    });
    revalidatePath(`/staff/agencies/${id}`);
    revalidatePath("/staff/agencies");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update agency.",
    };
  }
}

export async function setAgencyActiveAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.AGENCIES_MANAGE);
  const id = read(formData, "id");
  await reference.setAgencyActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/agencies/${id}`);
  revalidatePath("/staff/agencies");
}

export async function archiveAgencyAction(formData: FormData): Promise<void> {
  const actor = await requireActor(PERMISSIONS.AGENCIES_MANAGE);
  const id = read(formData, "id");
  await reference.archiveAgency(getDatabase(), actor, id);
  revalidatePath("/staff/agencies");
  redirect("/staff/agencies");
}

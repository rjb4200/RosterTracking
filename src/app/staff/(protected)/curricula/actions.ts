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

export async function createCurriculumAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  try {
    await reference.createCurriculum(getDatabase(), actor, {
      publisher: read(formData, "publisher"),
      programTitle: read(formData, "programTitle"),
      version: read(formData, "version"),
      additionalRequirements: read(formData, "additionalRequirements"),
      sourceRevision: read(formData, "sourceRevision"),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create curriculum.",
    };
  }
  revalidatePath("/staff/curricula");
  redirect("/staff/curricula");
}

export async function updateCurriculumAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateCurriculum(getDatabase(), actor, id, {
      publisher: read(formData, "publisher"),
      programTitle: read(formData, "programTitle"),
      version: read(formData, "version"),
      additionalRequirements: read(formData, "additionalRequirements"),
      sourceRevision: read(formData, "sourceRevision"),
    });
    revalidatePath(`/staff/curricula/${id}`);
    revalidatePath("/staff/curricula");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update curriculum.",
    };
  }
}

export async function setCurriculumActiveAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  const id = read(formData, "id");
  await reference.setCurriculumActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/curricula/${id}`);
  revalidatePath("/staff/curricula");
}

export async function archiveCurriculumAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.CURRICULA_MANAGE);
  const id = read(formData, "id");
  await reference.archiveCurriculum(getDatabase(), actor, id);
  revalidatePath(`/staff/curricula/${id}`);
  revalidatePath("/staff/curricula");
  redirect("/staff/curricula");
}

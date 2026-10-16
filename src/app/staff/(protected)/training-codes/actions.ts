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

export async function createTrainingCodeAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.TRAINING_CODES_MANAGE);
  try {
    await reference.createTrainingCode(getDatabase(), actor, {
      kind: read(formData, "kind") === "ems" ? "ems" : "fire",
      code: read(formData, "code"),
      title: read(formData, "title"),
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create training code.",
    };
  }
  revalidatePath("/staff/training-codes");
  redirect("/staff/training-codes");
}

export async function updateTrainingCodeAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor(PERMISSIONS.TRAINING_CODES_MANAGE);
  const id = read(formData, "id");
  try {
    await reference.updateTrainingCode(getDatabase(), actor, id, {
      kind: read(formData, "kind") === "ems" ? "ems" : "fire",
      code: read(formData, "code"),
      title: read(formData, "title"),
    });
    revalidatePath(`/staff/training-codes/${id}`);
    revalidatePath("/staff/training-codes");
    return {};
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update training code.",
    };
  }
}

export async function setTrainingCodeActiveAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.TRAINING_CODES_MANAGE);
  const id = read(formData, "id");
  await reference.setTrainingCodeActive(
    getDatabase(),
    actor,
    id,
    read(formData, "isActive") === "true",
  );
  revalidatePath(`/staff/training-codes/${id}`);
  revalidatePath("/staff/training-codes");
}

export async function archiveTrainingCodeAction(
  formData: FormData,
): Promise<void> {
  const actor = await requireActor(PERMISSIONS.TRAINING_CODES_MANAGE);
  const id = read(formData, "id");
  await reference.archiveTrainingCode(getDatabase(), actor, id);
  revalidatePath(`/staff/training-codes/${id}`);
  revalidatePath("/staff/training-codes");
  redirect("/staff/training-codes");
}

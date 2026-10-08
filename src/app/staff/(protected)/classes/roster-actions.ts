"use server";

import { revalidatePath } from "next/cache";

import {
  adjustCreditedHours,
  CREDIT_ADJUSTMENT_REASONS,
  removeAttendance,
} from "@/modules/instructor-roster/services";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface RosterActionState {
  error?: string;
  success?: string;
}

function read(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function creditReason(formData: FormData) {
  const preset = read(formData, "reasonPreset");
  if (!preset) return read(formData, "reason");
  if (
    !CREDIT_ADJUSTMENT_REASONS.includes(
      preset as (typeof CREDIT_ADJUSTMENT_REASONS)[number],
    )
  )
    throw new Error("Select a valid adjustment reason.");
  if (preset === "Other") {
    const explanation = read(formData, "otherReason").trim();
    if (!explanation) throw new Error("Explain the Other credit adjustment.");
    return explanation;
  }
  return preset;
}

export async function rosterAction(
  _prev: RosterActionState | undefined,
  formData: FormData,
): Promise<RosterActionState> {
  const actor = await requireActor(PERMISSIONS.CLASSES_MANAGE);
  const classId = read(formData, "classId");
  try {
    const operation = read(formData, "operation");
    if (operation === "credit") {
      await adjustCreditedHours(
        getDatabase(),
        actor,
        read(formData, "attendanceId"),
        Number(read(formData, "creditedHours")),
        creditReason(formData),
      );
    } else if (operation === "remove") {
      await removeAttendance(
        getDatabase(),
        actor,
        read(formData, "attendanceId"),
        read(formData, "reason"),
      );
    } else {
      return { error: "Invalid roster action." };
    }
    revalidatePath(`/staff/classes/${classId}/review`);
    revalidatePath(`/staff/classes/${classId}`);
    return { success: "Roster updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update the roster.",
    };
  }
}

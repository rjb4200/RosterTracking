"use server";

import { revalidatePath } from "next/cache";

import { updateReportingDestination } from "@/modules/classes/finalization";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ReportingActionState {
  error?: string;
  success?: string;
}

export async function updateReportingDestinationAction(
  _previous: ReportingActionState | undefined,
  formData: FormData,
): Promise<ReportingActionState> {
  const actor = await requireActor(PERMISSIONS.REPORTING_MANAGE);
  try {
    await updateReportingDestination(getDatabase(), actor, {
      revisionId: String(formData.get("revisionId") ?? ""),
      reportingSystemId: String(formData.get("reportingSystemId") ?? ""),
      status: String(formData.get("status") ?? ""),
      referenceNumber: String(formData.get("referenceNumber") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });
    revalidatePath("/staff/reporting");
    return { success: "Reporting destination updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update reporting.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { updateReportingDestination } from "@/modules/classes/finalization";
import { setInitialCertTei } from "@/modules/settings/services";
import { requirePermission } from "@/modules/staff-auth/authorization";
import { requireActor } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

export interface ReportingActionState {
  error?: string;
  success?: string;
}

export async function updateInitialCertTeiAction(
  _previous: ReportingActionState | undefined,
  formData: FormData,
): Promise<ReportingActionState> {
  const staff = await requirePermission(PERMISSIONS.REPORTING_MANAGE);
  try {
    await setInitialCertTei(
      getDatabase(),
      staff.roleCodes,
      String(formData.get("tei") ?? ""),
    );
    revalidatePath("/staff/reporting");
    return { success: "TEI number updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update the TEI number.",
    };
  }
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

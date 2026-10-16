import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { reportCatalog } from "@/modules/reports/catalog";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";
import { ReportsForm } from "./reports-form";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const staff = await getCurrentStaff();
  if (
    !staff?.permissions.has(PERMISSIONS.REPORTING_MANAGE) ||
    (!staff.roleCodes.has(ROLE_CODES.ADMINISTRATOR) &&
      !staff.roleCodes.has(ROLE_CODES.TRAINING_MAJOR))
  ) {
    redirect("/staff");
  }

  return (
    <main className="admin-content">
      <PageHeading eyebrow="Training Major workspace" title="Reports" />
      <section className="admin-section">
        <h2>Generate a report</h2>
        <p className="text-muted-foreground">
          Choose a date range and report to download. Reports reflect current
          class records, including changes made after finalization.
        </p>
        <ReportsForm
          reports={reportCatalog.map(({ id, label, description }) => ({
            id,
            label,
            description,
          }))}
        />
      </section>
    </main>
  );
}

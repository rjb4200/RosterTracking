import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import {
  listAgencies,
  listSites,
  listStudents,
} from "@/modules/reference/services";
import { reportCatalog } from "@/modules/reports/catalog";
import { renewalCyclePresets } from "@/modules/reports/period";
import { getCurrentStaff } from "@/modules/staff-auth/authorization";
import { PERMISSIONS, ROLE_CODES } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";
import { ReportsForm } from "./reports-form";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    report?: string;
    from?: string;
    to?: string;
    student?: string;
    agency?: string;
    site?: string;
  }>;
}) {
  const staff = await getCurrentStaff();
  if (
    !staff?.permissions.has(PERMISSIONS.REPORTING_MANAGE) ||
    (!staff.roleCodes.has(ROLE_CODES.ADMINISTRATOR) &&
      !staff.roleCodes.has(ROLE_CODES.TRAINING_MAJOR))
  ) {
    redirect("/staff");
  }

  const initial = await searchParams;
  const db = getDatabase();
  const [students, agencies, sites] = await Promise.all([
    listStudents(db, ""),
    listAgencies(db, ""),
    listSites(db, ""),
  ]);

  return (
    <main className="admin-content">
      <PageHeading eyebrow="Training Major workspace" title="Reports" />
      <section className="admin-section">
        <h2>Generate a report</h2>
        <p className="text-muted-foreground">
          Choose a period and a report to download. Reports reflect current
          class records, including changes made after finalization.
        </p>
        <ReportsForm
          reports={reportCatalog.map(
            ({ id, label, description, input, period }) => ({
              id,
              label,
              description,
              input,
              period,
            }),
          )}
          presets={renewalCyclePresets()}
          students={students.map((student) => ({
            value: student.id,
            label: `${student.lastName}, ${student.firstName}`,
          }))}
          agencies={agencies.map((agency) => ({
            value: agency.id,
            label: agency.name,
          }))}
          sites={sites.map((site) => ({ value: site.id, label: site.name }))}
          initial={{
            report: initial.report ?? "",
            from: initial.from ?? "",
            to: initial.to ?? "",
            student: initial.student ?? "",
            agency: initial.agency ?? "",
            site: initial.site ?? "",
          }}
        />
      </section>
    </main>
  );
}

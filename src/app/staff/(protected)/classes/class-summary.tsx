import type { getClassDetail } from "@/modules/classes/services";
import { formatDepartmentDateTime } from "@/modules/classes/time";

export function ClassSummary({
  classRecord,
}: {
  classRecord: Awaited<ReturnType<typeof getClassDetail>>;
}) {
  return (
    <dl className="wizard-review">
      <dt>Class name</dt>
      <dd>{classRecord.name ?? "Not set"}</dd>
      <dt>Training site</dt>
      <dd>{classRecord.site?.name ?? "Online"}</dd>
      <dt>Delivery</dt>
      <dd>{classRecord.deliveryMethod.replace("_", " ")}</dd>
      <dt>Host agency</dt>
      <dd>{classRecord.hostAgency?.name ?? "Not set"}</dd>
      <dt>Reporting systems</dt>
      <dd>
        {classRecord.reportingSystems.map((system) => system.name).join(", ") ||
          "None selected"}
      </dd>
      <dt>Lead instructor</dt>
      <dd>
        {classRecord.instructors
          .filter((instructor) => instructor.isLead)
          .map((instructor) => instructor.displayName)
          .join(", ") || "Not assigned"}
      </dd>
      <dt>Sessions</dt>
      <dd>
        {classRecord.components.length === 0
          ? "No sessions"
          : classRecord.components
              .map(
                (component) =>
                  `${formatDepartmentDateTime(component.startsAt)} (${component.creditedHours}h)`,
              )
              .join(", ")}
      </dd>
    </dl>
  );
}

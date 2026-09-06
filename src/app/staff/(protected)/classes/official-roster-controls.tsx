import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { TEMPLATE_MAPPINGS } from "@/modules/official-roster-pdfs/mappings";

export function OfficialRosterControls({ revisionId }: { revisionId: string }) {
  return (
    <section className="inline-form" aria-label="Official roster downloads">
      <span>Official rosters</span>
      {Object.values(TEMPLATE_MAPPINGS).map((mapping) => (
        <Link
          key={mapping.formType}
          href={`/api/staff/official-rosters/${revisionId}/${mapping.formType}`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Download {mapping.formType.toUpperCase()} PDF
        </Link>
      ))}
    </section>
  );
}

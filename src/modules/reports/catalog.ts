/** The extra input a report needs beyond the period. */
export type ReportInputKind = "student" | "agency" | "site";

/**
 * Client-safe metadata. Server builders live in registry.ts. `input` names the
 * additional selector the Reports workspace must show before the report can be
 * generated, or null when a period is enough.
 */
export const reportCatalog = [
  {
    id: "mtu-usage-summary",
    label: "MTU Usage Summary",
    description:
      "Grant tracking: training hours, students, locations, vehicle mileage, supplies, and equipment use.",
    input: null,
  },
  {
    id: "student-ce-transcript",
    label: "Student CE Transcript",
    description:
      "KBEMS requirements and the training delivered to one student in the period, with an optional certificate packet.",
    input: "student",
  },
  {
    id: "agency-training-delivered",
    label: "Agency Training Delivered",
    description:
      "Training delivered to an agency's people over the period: classes, courses, categories, hours, and attendees.",
    input: "agency",
  },
  {
    id: "site-training-delivered",
    label: "Training Site Delivered",
    description:
      "Training delivered at a training site over the period: classes, courses, categories, hours, and attendees.",
    input: "site",
  },
] as const satisfies readonly {
  id: string;
  label: string;
  description: string;
  input: ReportInputKind | null;
}[];

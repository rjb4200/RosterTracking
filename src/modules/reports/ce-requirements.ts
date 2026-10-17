/**
 * The KBEMS Continuing Education requirement rule, as a fixed reference table.
 *
 * This is deliberately NOT derived from the editable EMS category catalog: the
 * shipped `training_codes` list can be renamed, archived, or extended by staff,
 * and the printed requirements must never change as a result. The reports print
 * this table for reference only and never compute a "met"/"remaining" figure,
 * because a single class cannot faithfully attribute hours across content areas
 * (for example an EMS course may satisfy several) or to Pediatric content.
 */

export const CE_REQUIREMENT_LEVELS = [
  "EMR",
  "EMT",
  "AEMT",
  "Paramedic",
] as const;

export type CeRequirementLevel = (typeof CE_REQUIREMENT_LEVELS)[number];

/** Stamped on the reference table so a rule change is a single, obvious edit. */
export const CE_REQUIREMENTS_SOURCE_REVISION = "kbems-ce-2024";

export interface CeRequirementRow {
  category: string;
  hours: Record<CeRequirementLevel, number>;
}

const hours = (
  values: [number, number, number, number],
): Record<CeRequirementLevel, number> =>
  Object.fromEntries(
    CE_REQUIREMENT_LEVELS.map((level, index) => [level, values[index]]),
  ) as Record<CeRequirementLevel, number>;

/**
 * Content categories that require hours, by clinician level. Pediatric is one
 * of them, so it counts toward the total like every other category.
 */
export const CE_REQUIREMENT_ROWS: readonly CeRequirementRow[] = [
  { category: "Airway", hours: hours([1.5, 4, 5, 6]) },
  { category: "Cardiology", hours: hours([2, 5, 6, 7]) },
  { category: "Trauma", hours: hours([1, 3, 4, 5]) },
  { category: "Medical", hours: hours([2.5, 6, 7, 8]) },
  { category: "Operations", hours: hours([1, 2, 3, 4]) },
  { category: "Pediatric", hours: hours([1, 2, 2.5, 3]) },
  { category: "HIV/AIDS", hours: hours([1, 1, 1, 1]) },
  { category: "PAHT", hours: hours([1, 1, 1, 1]) },
  { category: "SVAT", hours: hours([1, 1, 1, 1]) },
];

/** The column total of the content-category requirements, by level. */
export const CE_TOTAL_ROW: CeRequirementRow = {
  category: "Total",
  hours: Object.fromEntries(
    CE_REQUIREMENT_LEVELS.map((level) => [
      level,
      CE_REQUIREMENT_ROWS.reduce((sum, row) => sum + row.hours[level], 0),
    ]),
  ) as Record<CeRequirementLevel, number>,
};

/** The content-category labels in the order the reference table prints them. */
export const CE_REQUIREMENT_CATEGORY_LABELS: readonly string[] =
  CE_REQUIREMENT_ROWS.map((row) => row.category);

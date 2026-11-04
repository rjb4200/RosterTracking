export const INITIAL_CERTIFICATION_CATEGORY_SOURCE_REVISION =
  "initial-certification-2025";

export const INITIAL_CERTIFICATION_PROGRAMS = [
  { code: "emr", title: "EMR", categoryName: "EMR", hours: 40 },
  { code: "emt_b", title: "EMT-B", categoryName: "EMT-B", hours: 160 },
  { code: "aemt", title: "AEMT", categoryName: "AEMT", hours: 190 },
] as const;

export type InitialCertificationProgram =
  (typeof INITIAL_CERTIFICATION_PROGRAMS)[number];

export function isInitialCertificationProgramCode(
  value: string,
): value is InitialCertificationProgram["code"] {
  return INITIAL_CERTIFICATION_PROGRAMS.some(
    (program) => program.code === value,
  );
}

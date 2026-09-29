export interface FireSubject {
  trainingCodeId: string;
  className: string;
  curriculumId?: string | null;
  lessonPlan?: string | null;
}

/** A Fire subject row needs a category and a class name; the rest is optional. */
export function isFireSubjectComplete(subject: FireSubject): boolean {
  return Boolean(subject.trainingCodeId) && Boolean(subject.className.trim());
}

export function validateFireSubjects(
  subjects: readonly FireSubject[],
): boolean {
  return subjects.length > 0 && subjects.every(isFireSubjectComplete);
}

/** The KFS-1A Method checkboxes, in the order they appear on the form. */
export const KFS_METHOD_CODES = ["cr", "ho", "ol"] as const;

export type KfsMethodCode = (typeof KFS_METHOD_CODES)[number];

/**
 * Maps a class delivery method to the KFS-1A Method codes it marks.
 * Hybrid splits between classroom and online delivery, so it marks both the
 * CR and OL boxes.
 */
export function componentMethodsForDelivery(
  deliveryMethod: string,
): KfsMethodCode[] {
  if (deliveryMethod === "classroom") return ["cr"];
  if (deliveryMethod === "hands_on") return ["ho"];
  if (deliveryMethod === "online") return ["ol"];
  if (deliveryMethod === "hybrid") return ["cr", "ol"];
  return [];
}

/** The stored method value for a delivery method: "cr", "ho", "ol", "cr,ol", or null. */
export function defaultComponentMethod(deliveryMethod: string): string | null {
  const codes = componentMethodsForDelivery(deliveryMethod);
  return codes.length > 0 ? codes.join(",") : null;
}

/** Parses a stored method value into its KFS-1A codes, in form order. */
export function parseComponentMethod(
  stored: string | null | undefined,
): KfsMethodCode[] {
  if (!stored) return [];
  const selected = new Set(
    stored
      .split(",")
      .map((code) => code.trim().toLowerCase())
      .filter(Boolean),
  );
  return KFS_METHOD_CODES.filter((code) => selected.has(code));
}

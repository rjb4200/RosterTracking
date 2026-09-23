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

/** Maps a class delivery method to the KFS-1A method code. Hybrid has none. */
export function defaultComponentMethod(
  deliveryMethod: string,
): "cr" | "ho" | "ol" | null {
  if (deliveryMethod === "classroom") return "cr";
  if (deliveryMethod === "hands_on") return "ho";
  if (deliveryMethod === "online") return "ol";
  return null;
}

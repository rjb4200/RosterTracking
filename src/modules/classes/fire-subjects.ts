export interface FireSubject {
  trainingCodeId: string;
  className: string;
  curriculumId?: string | null;
  curriculumName?: string | null;
  curriculumChapter?: string | null;
  lessonPlan?: string | null;
}

export interface CurriculumChapter {
  part: string | null;
  number: string;
  title: string;
}

/** The label a chapter is offered and printed with, including its section. */
export function chapterLabel(chapter: CurriculumChapter): string {
  const base = `Chapter ${chapter.number}. ${chapter.title}`;
  const part = chapter.part?.trim();
  return part ? `${part}: ${base}` : base;
}

export interface CurriculumLabelParts {
  curriculumPublisher?: string | null;
  curriculumProgramTitle?: string | null;
  curriculumVersion?: string | null;
  curriculumName?: string | null;
  curriculumChapter?: string | null;
}

/**
 * The official Curriculum cell: the catalog or typed book followed by the
 * chapter, joined as "<book> - <chapter>". A typed book replaces the catalog
 * label; absent values are omitted rather than printed as placeholders.
 */
export function composeCurriculumLabel(
  component: CurriculumLabelParts,
): string {
  const typedBook = component.curriculumName?.trim();
  const book = typedBook
    ? typedBook
    : [
        component.curriculumPublisher,
        component.curriculumProgramTitle,
        component.curriculumVersion,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ");
  const chapter = component.curriculumChapter?.trim();
  if (book && chapter) return `${book} - ${chapter}`;
  return book || chapter || "";
}

/**
 * A Fire subject row needs a category and a class name. A chapter is also
 * required when the chosen approved curriculum has catalog chapters.
 */
export function isFireSubjectComplete(
  subject: FireSubject,
  curriculumHasChapters = false,
): boolean {
  if (!subject.trainingCodeId || !subject.className.trim()) return false;
  if (curriculumHasChapters && !subject.curriculumChapter?.trim()) return false;
  return true;
}

export function validateFireSubjects(
  subjects: readonly FireSubject[],
  curriculaWithChapters: ReadonlySet<string> = new Set(),
): boolean {
  return (
    subjects.length > 0 &&
    subjects.every((subject) =>
      isFireSubjectComplete(
        subject,
        Boolean(
          subject.curriculumId &&
            curriculaWithChapters.has(subject.curriculumId),
        ),
      ),
    )
  );
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

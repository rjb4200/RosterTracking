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

/** A select sentinel for a typed chapter; never a real chapter label. */
export const NOT_LISTED_CHAPTER = "__not_listed__";

export interface ChapterSelectionState {
  selectValue: string;
  custom: boolean;
}

/** True when the value matches one of the curriculum's catalog chapter labels. */
export function isCatalogChapter(
  chapters: readonly CurriculumChapter[],
  value: string | null | undefined,
): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return chapters.some((chapter) => chapterLabel(chapter) === trimmed);
}

/**
 * The select value and whether the typed input is needed. A cleared chapter
 * produces no custom state, so clearing a curriculum resets the control.
 */
export function chapterSelectionState(
  chapters: readonly CurriculumChapter[],
  value: string | null | undefined,
): ChapterSelectionState {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { selectValue: "", custom: false };
  if (isCatalogChapter(chapters, trimmed)) {
    return { selectValue: trimmed, custom: false };
  }
  return { selectValue: NOT_LISTED_CHAPTER, custom: true };
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

export interface CurriculumOptionSource {
  id: string;
  publisher: string;
  programTitle: string;
  version: string | null;
}

/** The catalog label for a curriculum: publisher — program title (version). */
export function curriculumLabel(curriculum: {
  publisher: string;
  programTitle: string;
  version: string | null;
}): string {
  return `${curriculum.publisher} — ${curriculum.programTitle}${
    curriculum.version ? ` (${curriculum.version})` : ""
  }`;
}

export interface SearchOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * Chapter options for a search control: the chapter label is both the value
 * and the label, and a section becomes the option group heading.
 */
export function chapterSearchOptions(
  chapters: readonly CurriculumChapter[],
): SearchOption[] {
  return chapters.map((chapter) => {
    const label = chapterLabel(chapter);
    const part = chapter.part?.trim();
    return part
      ? { value: label, label, group: part }
      : { value: label, label };
  });
}

/**
 * Curriculum options for a search control: the actor's recently used curricula
 * first, then the full catalog. Recent entries also appear in the full group.
 */
export function curriculumSearchOptions(
  curricula: CurriculumOptionSource[],
  recentCurriculumIds: readonly string[],
): SearchOption[] {
  const recent = new Set(recentCurriculumIds);
  return [
    ...curricula
      .filter((curriculum) => recent.has(curriculum.id))
      .map((curriculum) => ({
        value: curriculum.id,
        label: curriculumLabel(curriculum),
        group: "Recently used",
      })),
    ...curricula.map((curriculum) => ({
      value: curriculum.id,
      label: curriculumLabel(curriculum),
      group: "All curricula",
    })),
  ];
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

export {
  componentMethodLabels,
  componentMethodsForDelivery,
  defaultComponentMethod,
  KFS_METHOD_CODES,
  type KfsMethodCode,
  parseComponentMethod,
} from "./delivery-methods";

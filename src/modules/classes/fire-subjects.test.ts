import { describe, expect, it } from "vitest";

import {
  chapterLabel,
  chapterSearchOptions,
  chapterSelectionState,
  chapterTitleForLessonPlan,
  componentMethodsForDelivery,
  composeCurriculumLabel,
  curriculumLabel,
  curriculumSearchOptions,
  defaultComponentMethod,
  isCatalogChapter,
  isFireSubjectComplete,
  lessonPlanForChapterChange,
  NOT_LISTED_CHAPTER,
  parseComponentMethod,
  validateFireSubjects,
} from "./fire-subjects";

describe("fire subjects", () => {
  it("requires a category and a class name", () => {
    expect(
      isFireSubjectComplete({
        trainingCodeId: "code",
        className: "Hose Loads",
      }),
    ).toBe(true);
    expect(
      isFireSubjectComplete({ trainingCodeId: "", className: "Hose Loads" }),
    ).toBe(false);
    expect(
      isFireSubjectComplete({ trainingCodeId: "code", className: "   " }),
    ).toBe(false);
  });

  it("validates a non-empty list of complete subjects", () => {
    expect(validateFireSubjects([])).toBe(false);
    expect(
      validateFireSubjects([
        { trainingCodeId: "c1", className: "Hose Loads" },
        { trainingCodeId: "c2", className: "SCBA" },
      ]),
    ).toBe(true);
    expect(
      validateFireSubjects([
        { trainingCodeId: "c1", className: "Hose Loads" },
        { trainingCodeId: "", className: "SCBA" },
      ]),
    ).toBe(false);
  });

  it("maps every delivery set to its KFS-1A method union", () => {
    expect(componentMethodsForDelivery("classroom")).toEqual(["cr"]);
    expect(componentMethodsForDelivery("hands_on")).toEqual(["ho"]);
    expect(componentMethodsForDelivery("online")).toEqual(["ol"]);
    expect(componentMethodsForDelivery("classroom,hands_on")).toEqual([
      "cr",
      "ho",
    ]);
    expect(componentMethodsForDelivery("hands_on,online")).toEqual([
      "ho",
      "ol",
    ]);
    expect(componentMethodsForDelivery("classroom,hands_on,online")).toEqual([
      "cr",
      "ho",
      "ol",
    ]);
    // Legacy hybrid reads as classroom + online.
    expect(componentMethodsForDelivery("hybrid")).toEqual(["cr", "ol"]);
    expect(componentMethodsForDelivery("unknown")).toEqual([]);
  });

  it("stores the canonical method set for a delivery set", () => {
    expect(defaultComponentMethod("classroom")).toBe("cr");
    expect(defaultComponentMethod("hands_on")).toBe("ho");
    expect(defaultComponentMethod("online")).toBe("ol");
    expect(defaultComponentMethod("classroom,hands_on")).toBe("cr,ho");
    expect(defaultComponentMethod("hybrid")).toBe("cr,ol");
    expect(defaultComponentMethod("unknown")).toBeNull();
  });

  it("parses a stored method into its KFS-1A codes in form order", () => {
    expect(parseComponentMethod("cr")).toEqual(["cr"]);
    expect(parseComponentMethod("cr,ol")).toEqual(["cr", "ol"]);
    // Order on the form wins, regardless of how the value was stored.
    expect(parseComponentMethod("ol,cr")).toEqual(["cr", "ol"]);
    expect(parseComponentMethod("ho")).toEqual(["ho"]);
    expect(parseComponentMethod("")).toEqual([]);
    expect(parseComponentMethod(null)).toEqual([]);
    expect(parseComponentMethod(undefined)).toEqual([]);
    expect(parseComponentMethod("bogus")).toEqual([]);
  });
});

describe("curriculum chapters", () => {
  it("labels a chapter with its section when it has one", () => {
    expect(
      chapterLabel({
        part: "Firefighter I",
        number: "3",
        title: "Communications",
      }),
    ).toBe("Firefighter I: Chapter 3. Communications");
    expect(
      chapterLabel({ part: "", number: "1", title: "The Fire Service" }),
    ).toBe("Chapter 1. The Fire Service");
    expect(chapterLabel({ part: null, number: "10", title: "Fire Hose" })).toBe(
      "Chapter 10. Fire Hose",
    );
  });

  it("builds chapter options grouped by section", () => {
    const chapters = [
      {
        part: "Firefighter I",
        number: "3",
        title: "Communications",
      },
      {
        part: "Firefighter II",
        number: "1",
        title: "Incident Scene Operations",
      },
      { part: null, number: "A", title: "Appendix" },
    ];
    expect(chapterSearchOptions(chapters)).toEqual([
      {
        value: "Firefighter I: Chapter 3. Communications",
        label: "Firefighter I: Chapter 3. Communications",
        group: "Firefighter I",
      },
      {
        value: "Firefighter II: Chapter 1. Incident Scene Operations",
        label: "Firefighter II: Chapter 1. Incident Scene Operations",
        group: "Firefighter II",
      },
      { value: "Chapter A. Appendix", label: "Chapter A. Appendix" },
    ]);
  });

  it("matches catalog chapters and identifies a typed chapter", () => {
    const chapters = [
      { part: "Firefighter I", number: "3", title: "Communications" },
    ];
    expect(
      isCatalogChapter(chapters, "Firefighter I: Chapter 3. Communications"),
    ).toBe(true);
    expect(isCatalogChapter(chapters, "Chapter 99. Missing")).toBe(false);
    expect(isCatalogChapter(chapters, "")).toBe(false);
    expect(
      chapterSelectionState(
        chapters,
        "Firefighter I: Chapter 3. Communications",
      ),
    ).toEqual({
      selectValue: "Firefighter I: Chapter 3. Communications",
      custom: false,
    });
    expect(chapterSelectionState(chapters, "Typed Chapter")).toEqual({
      selectValue: NOT_LISTED_CHAPTER,
      custom: true,
    });
    // Clearing the chapter resets both the select and the typed-input state.
    expect(chapterSelectionState(chapters, "")).toEqual({
      selectValue: "",
      custom: false,
    });
  });

  it("seeds and preserves the lesson plan from the chapter title", () => {
    const chapters = [
      { part: "Firefighter I", number: "3", title: "Communications" },
      { part: "Firefighter I", number: "4", title: "Fire Hose" },
    ];
    const communications = "Firefighter I: Chapter 3. Communications";

    expect(chapterTitleForLessonPlan(chapters, communications)).toBe(
      "Communications",
    );
    expect(chapterTitleForLessonPlan(chapters, "Typed Chapter")).toBeNull();
    expect(chapterTitleForLessonPlan(chapters, "")).toBeNull();
    expect(lessonPlanForChapterChange("", null, null)).toBe("");

    // Empty plans fill; manual plans stay put.
    expect(lessonPlanForChapterChange("", null, "Communications")).toBe(
      "Communications",
    );
    expect(
      lessonPlanForChapterChange("My lesson", null, "Communications"),
    ).toBe("My lesson");

    // An auto-filled title follows the chapter; manual text does not.
    expect(
      lessonPlanForChapterChange(
        "Communications",
        "Communications",
        "Fire Hose",
      ),
    ).toBe("Fire Hose");
    expect(
      lessonPlanForChapterChange("My lesson", "Communications", "Fire Hose"),
    ).toBe("My lesson");

    // Clearing the chapter clears only the auto-filled title.
    expect(
      lessonPlanForChapterChange("Communications", "Communications", null),
    ).toBe("");
    expect(
      lessonPlanForChapterChange("My lesson", "Communications", null),
    ).toBe("My lesson");
  });

  it("composes the Curriculum cell from the book and chapter", () => {
    expect(
      composeCurriculumLabel({
        curriculumPublisher: "IFSTA",
        curriculumProgramTitle: "Essentials of Firefighting",
        curriculumVersion: "8th Edition",
        curriculumChapter: "Chapter 3. Communications",
      }),
    ).toBe(
      "IFSTA Essentials of Firefighting 8th Edition - Chapter 3. Communications",
    );
    // A typed book replaces the catalog label.
    expect(
      composeCurriculumLabel({
        curriculumName: "Custom Book",
        curriculumChapter: "Chapter 1. Intro",
      }),
    ).toBe("Custom Book - Chapter 1. Intro");
    // Absent values are omitted, not printed as placeholders.
    expect(
      composeCurriculumLabel({
        curriculumPublisher: "IFSTA",
        curriculumProgramTitle: "Essentials of Firefighting",
      }),
    ).toBe("IFSTA Essentials of Firefighting");
    expect(composeCurriculumLabel({})).toBe("");
  });

  it("requires a chapter only when the curriculum has catalog chapters", () => {
    const withChapters = new Set(["curriculum-a"]);
    expect(
      validateFireSubjects(
        [
          {
            trainingCodeId: "c1",
            className: "Hose Loads",
            curriculumId: "curriculum-a",
          },
        ],
        withChapters,
      ),
    ).toBe(false);
    expect(
      validateFireSubjects(
        [
          {
            trainingCodeId: "c1",
            className: "Hose Loads",
            curriculumId: "curriculum-a",
            curriculumChapter: "Chapter 3. Communications",
          },
        ],
        withChapters,
      ),
    ).toBe(true);
    // A curriculum with no catalog chapters leaves the chapter optional.
    expect(
      validateFireSubjects(
        [
          {
            trainingCodeId: "c1",
            className: "Hose Loads",
            curriculumId: "curriculum-b",
          },
        ],
        withChapters,
      ),
    ).toBe(true);
    // A typed book is not subject to the requirement.
    expect(
      validateFireSubjects(
        [
          {
            trainingCodeId: "c1",
            className: "Hose Loads",
            curriculumName: "Custom Book",
          },
        ],
        withChapters,
      ),
    ).toBe(true);
  });
});

describe("curriculum search options", () => {
  const alpha = {
    id: "a",
    publisher: "IFSTA",
    programTitle: "Alpha",
    version: "1st Edition",
  };
  const bravo = {
    id: "b",
    publisher: "IFSTA",
    programTitle: "Bravo",
    version: null,
  };
  const charlie = {
    id: "c",
    publisher: "IFSTA",
    programTitle: "Charlie",
    version: "2nd Edition",
  };
  const curricula = [alpha, bravo, charlie];

  it("labels a curriculum with publisher, title, and version", () => {
    expect(curriculumLabel(alpha)).toBe("IFSTA — Alpha (1st Edition)");
    expect(curriculumLabel(bravo)).toBe("IFSTA — Bravo");
  });

  it("puts recently used curricula first and repeats them in the full group", () => {
    expect(curriculumSearchOptions(curricula, ["c"])).toEqual([
      {
        value: "c",
        label: "IFSTA — Charlie (2nd Edition)",
        group: "Recently used",
      },
      {
        value: "a",
        label: "IFSTA — Alpha (1st Edition)",
        group: "All curricula",
      },
      { value: "b", label: "IFSTA — Bravo", group: "All curricula" },
      {
        value: "c",
        label: "IFSTA — Charlie (2nd Edition)",
        group: "All curricula",
      },
    ]);
  });

  it("omits the recently used group when there is no history", () => {
    const options = curriculumSearchOptions(curricula, []);
    expect(options).toHaveLength(3);
    expect(options.every((option) => option.group === "All curricula")).toBe(
      true,
    );
  });

  it("ignores recent ids that are not in the catalog", () => {
    const options = curriculumSearchOptions(curricula, ["missing"]);
    expect(options.some((option) => option.group === "Recently used")).toBe(
      false,
    );
  });
});

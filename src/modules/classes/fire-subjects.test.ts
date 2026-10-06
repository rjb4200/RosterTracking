import { describe, expect, it } from "vitest";

import {
  chapterLabel,
  componentMethodsForDelivery,
  composeCurriculumLabel,
  defaultComponentMethod,
  isFireSubjectComplete,
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

  it("maps delivery methods to KFS-1A method codes", () => {
    expect(componentMethodsForDelivery("classroom")).toEqual(["cr"]);
    expect(componentMethodsForDelivery("hands_on")).toEqual(["ho"]);
    expect(componentMethodsForDelivery("online")).toEqual(["ol"]);
    // Hybrid is taught partly in a classroom and partly online, so it marks
    // both the CR and OL boxes.
    expect(componentMethodsForDelivery("hybrid")).toEqual(["cr", "ol"]);
    expect(componentMethodsForDelivery("unknown")).toEqual([]);
  });

  it("stores the mapped method for a delivery method", () => {
    expect(defaultComponentMethod("classroom")).toBe("cr");
    expect(defaultComponentMethod("hands_on")).toBe("ho");
    expect(defaultComponentMethod("online")).toBe("ol");
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

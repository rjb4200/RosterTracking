import { describe, expect, it } from "vitest";

import { wizardStepErrors } from "./wizard-validation";

function base(overrides: Partial<Parameters<typeof wizardStepErrors>[1]> = {}) {
  return {
    reportingSystemIds: [] as string[],
    needsClassName: false,
    className: "",
    needsSite: false,
    trainingSiteId: "",
    startsAt: "2026-09-10T09:00",
    creditedHours: "4",
    leadInstructorId: "user-1",
    hostAgencyId: "agency-1",
    kbemsCourseName: "",
    courseType: "",
    objectives: "",
    courseNumber: "",
    subjects: [] as Array<{
      trainingCodeId: string;
      className: string;
      curriculumId: string;
      curriculumChapter: string;
    }>,
    curriculaWithChapters: new Set<string>(),
    ...overrides,
  };
}

describe("wizard step validation", () => {
  it("requires at least one destination", () => {
    expect(wizardStepErrors("destinations", base())).toEqual([
      "reportingSystemIds",
    ]);
    expect(
      wizardStepErrors("destinations", base({ reportingSystemIds: ["fire"] })),
    ).toEqual([]);
  });

  it("identifies missing Fire subject inputs", () => {
    expect(
      wizardStepErrors(
        "fire",
        base({
          subjects: [
            {
              trainingCodeId: "",
              className: "",
              curriculumId: "",
              curriculumChapter: "",
            },
          ],
        }),
      ),
    ).toEqual(["fire.0.trainingCodeId", "fire.0.className"]);
    expect(
      wizardStepErrors(
        "fire",
        base({
          subjects: [
            {
              trainingCodeId: "code",
              className: "Hose Loads",
              curriculumId: "",
              curriculumChapter: "",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("requires a chapter only for curricula that have chapters", () => {
    const curriculaWithChapters = new Set(["cur-a"]);
    expect(
      wizardStepErrors(
        "fire",
        base({
          curriculaWithChapters,
          subjects: [
            {
              trainingCodeId: "code",
              className: "Hose Loads",
              curriculumId: "cur-a",
              curriculumChapter: "",
            },
          ],
        }),
      ),
    ).toEqual(["fire.0.curriculumChapter"]);
    // A curriculum without catalog chapters leaves the chapter optional.
    expect(
      wizardStepErrors(
        "fire",
        base({
          curriculaWithChapters,
          subjects: [
            {
              trainingCodeId: "code",
              className: "Hose Loads",
              curriculumId: "cur-b",
              curriculumChapter: "",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });

  it("requires the EMS course details and the course number only for initial certification", () => {
    expect(wizardStepErrors("kbems", base())).toEqual([
      "kbemsCourseName",
      "courseType",
      "objectives",
    ]);
    // A non-initial class needs no course number.
    expect(
      wizardStepErrors(
        "kbems",
        base({
          kbemsCourseName: "EMT Refresher",
          courseType: "refresher",
          objectives: "Review of EMT skills",
        }),
      ),
    ).toEqual([]);
    // An initial-certification class requires the course number.
    expect(
      wizardStepErrors(
        "kbems",
        base({
          kbemsCourseName: "EMT Initial",
          courseType: "initial_certification",
          objectives: "Initial EMT certification",
        }),
      ),
    ).toEqual(["courseNumber"]);
    expect(
      wizardStepErrors(
        "kbems",
        base({
          kbemsCourseName: "EMT Initial",
          courseType: "initial_certification",
          objectives: "Initial EMT certification",
          courseNumber: "EMS-100",
        }),
      ),
    ).toEqual([]);
  });

  it("identifies missing class-and-schedule inputs", () => {
    expect(wizardStepErrors("class", base())).toEqual([]);
    expect(
      wizardStepErrors(
        "class",
        base({ needsClassName: true, needsSite: true }),
      ),
    ).toEqual(["className", "trainingSiteId"]);
    expect(
      wizardStepErrors(
        "class",
        base({
          needsClassName: true,
          className: "Course",
          needsSite: true,
          trainingSiteId: "site-1",
        }),
      ),
    ).toEqual([]);
  });
});

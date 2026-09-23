import { describe, expect, it } from "vitest";

import {
  defaultComponentMethod,
  isFireSubjectComplete,
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
    expect(defaultComponentMethod("classroom")).toBe("cr");
    expect(defaultComponentMethod("hands_on")).toBe("ho");
    expect(defaultComponentMethod("online")).toBe("ol");
    expect(defaultComponentMethod("hybrid")).toBeNull();
  });
});

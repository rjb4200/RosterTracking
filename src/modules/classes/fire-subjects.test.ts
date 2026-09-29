import { describe, expect, it } from "vitest";

import {
  componentMethodsForDelivery,
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

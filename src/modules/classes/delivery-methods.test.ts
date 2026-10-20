import { describe, expect, it } from "vitest";

import {
  componentMethodLabels,
  componentMethodsForDelivery,
  defaultComponentMethod,
  deliveryMethodLabels,
  deliveryMethodsFromComponentMethods,
  formatComponentMethod,
  formatDeliveryMethods,
  parseComponentMethod,
  parseDeliveryMethods,
} from "./delivery-methods";

describe("delivery method sets", () => {
  it("parses a delivery set into canonical order and removes duplicates", () => {
    expect(parseDeliveryMethods("online,classroom,classroom")).toEqual([
      "classroom",
      "online",
    ]);
    expect(parseDeliveryMethods("hands_on,classroom")).toEqual([
      "classroom",
      "hands_on",
    ]);
    expect(parseDeliveryMethods("classroom,hands_on,online")).toEqual([
      "classroom",
      "hands_on",
      "online",
    ]);
  });

  it("normalizes legacy delivery values on read", () => {
    expect(parseDeliveryMethods("hybrid")).toEqual(["classroom", "online"]);
    expect(parseDeliveryMethods("in_person")).toEqual(["classroom"]);
    expect(parseDeliveryMethods("virtual")).toEqual(["online"]);
    expect(parseDeliveryMethods("bogus")).toEqual([]);
    expect(parseDeliveryMethods("")).toEqual([]);
    expect(parseDeliveryMethods(null)).toEqual([]);
  });

  it("formats a canonical stored set ", () => {
    expect(formatDeliveryMethods("online, classroom")).toBe("classroom,online");
    expect(formatDeliveryMethods("hybrid")).toBe("classroom,online");
    expect(formatDeliveryMethods("")).toBe("");
  });

  it("labels a delivery set for display", () => {
    expect(deliveryMethodLabels("classroom,hands_on")).toBe(
      "Classroom + Hands-On",
    );
    expect(deliveryMethodLabels("classroom,hands_on,online")).toBe(
      "Classroom + Hands-On + Online",
    );
    expect(deliveryMethodLabels("hybrid")).toBe("Classroom + Online");
    expect(deliveryMethodLabels("")).toBe("");
  });
});

describe("KFS-1A method sets", () => {
  it("maps every delivery set to the union of method codes", () => {
    expect(componentMethodsForDelivery("classroom")).toEqual(["cr"]);
    expect(componentMethodsForDelivery("hands_on")).toEqual(["ho"]);
    expect(componentMethodsForDelivery("online")).toEqual(["ol"]);
    expect(componentMethodsForDelivery("classroom,hands_on")).toEqual([
      "cr",
      "ho",
    ]);
    expect(componentMethodsForDelivery("classroom,online")).toEqual([
      "cr",
      "ol",
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
    expect(componentMethodsForDelivery("hybrid")).toEqual(["cr", "ol"]);
    expect(componentMethodsForDelivery("")).toEqual([]);
  });

  it("stores the canonical default method set", () => {
    expect(defaultComponentMethod("classroom,hands_on")).toBe("cr,ho");
    expect(defaultComponentMethod("hands_on,online")).toBe("ho,ol");
    expect(defaultComponentMethod("hybrid")).toBe("cr,ol");
    expect(defaultComponentMethod("")).toBeNull();
  });

  it("parses every method combination in form order", () => {
    expect(parseComponentMethod("cr,ho")).toEqual(["cr", "ho"]);
    expect(parseComponentMethod("ol,ho,cr")).toEqual(["cr", "ho", "ol"]);
    expect(parseComponentMethod("ho")).toEqual(["ho"]);
    expect(parseComponentMethod("bogus")).toEqual([]);
    expect(parseComponentMethod("")).toEqual([]);
  });

  it("formats and labels a method set", () => {
    expect(formatComponentMethod("ho,cr")).toBe("cr,ho");
    expect(formatComponentMethod("bogus")).toBeNull();
    expect(componentMethodLabels("cr,ho")).toBe("CR + HO");
    expect(componentMethodLabels("")).toBe("");
  });

  it("derives delivery from the union of session methods", () => {
    expect(deliveryMethodsFromComponentMethods(["ho", "cr,ol", "bogus"])).toBe(
      "classroom,hands_on,online",
    );
    expect(deliveryMethodsFromComponentMethods([null, ""])).toBe("");
  });
});

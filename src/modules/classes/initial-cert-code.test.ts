import { describe, expect, it } from "vitest";

import {
  deriveRecentInitialCertNumbers,
  isInitialCertNumberValid,
  normalizeInitialCertNumber,
  RECENT_INITIAL_CERT_NUMBER_LIMIT,
} from "./initial-cert-code";

describe("initial-certification number format", () => {
  it("accepts the expected shape for each type letter", () => {
    for (const type of ["R", "B", "A", "P"]) {
      expect(isInitialCertNumberValid(`126-26-02-${type}`, "126")).toBe(true);
    }
  });

  it("accepts lowercase letters", () => {
    expect(isInitialCertNumberValid("126-26-02-r", "126")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isInitialCertNumberValid("  126-26-02-r  ", "126")).toBe(true);
  });

  it("rejects a type letter outside R, B, A, P", () => {
    expect(isInitialCertNumberValid("126-26-02-X", "126")).toBe(false);
  });

  it("rejects wrong segment widths", () => {
    expect(isInitialCertNumberValid("12-26-02-R", "126")).toBe(false);
    expect(isInitialCertNumberValid("126-6-02-R", "126")).toBe(false);
    expect(isInitialCertNumberValid("126-26-2-R", "126")).toBe(false);
    expect(isInitialCertNumberValid("126-26-002-R", "126")).toBe(false);
    expect(isInitialCertNumberValid("126-26-02-RR", "126")).toBe(false);
  });

  it("rejects a value without the separators", () => {
    expect(isInitialCertNumberValid("1262602R", "126")).toBe(false);
  });

  it("matches the configured TEI prefix", () => {
    expect(isInitialCertNumberValid("999-26-02-R", "999")).toBe(true);
    expect(isInitialCertNumberValid("126-26-02-R", "999")).toBe(false);
  });

  it("rejects when the TEI is not three digits", () => {
    expect(isInitialCertNumberValid("126-26-02-R", "12")).toBe(false);
  });

  it("normalizes to trimmed uppercase", () => {
    expect(normalizeInitialCertNumber(" 126-26-02-r ")).toBe("126-26-02-R");
  });
});

describe("recent initial-certification numbers", () => {
  it("keeps distinct values in first-seen (most recent) order", () => {
    expect(
      deriveRecentInitialCertNumbers([
        { courseNumber: "126-26-02-R" },
        { courseNumber: "126-26-03-B" },
        { courseNumber: "126-26-02-R" },
        { courseNumber: "126-26-04-A" },
      ]),
    ).toEqual(["126-26-02-R", "126-26-03-B", "126-26-04-A"]);
  });

  it("excludes empty and null values", () => {
    expect(
      deriveRecentInitialCertNumbers([
        { courseNumber: "" },
        { courseNumber: null },
        { courseNumber: "126-26-05-P" },
      ]),
    ).toEqual(["126-26-05-P"]);
  });

  it("caps the list at the limit", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      courseNumber: `126-26-${String(index).padStart(2, "0")}-R`,
    }));
    expect(deriveRecentInitialCertNumbers(rows)).toHaveLength(
      RECENT_INITIAL_CERT_NUMBER_LIMIT,
    );
    expect(deriveRecentInitialCertNumbers(rows, 2)).toEqual([
      "126-26-00-R",
      "126-26-01-R",
    ]);
  });
});

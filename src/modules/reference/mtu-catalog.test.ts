import { describe, expect, it } from "vitest";

import { normalizeMtuCatalogItem } from "./services";

describe("normalizeMtuCatalogItem", () => {
  it("gives equipment no quantity rule and no mileage flag", () => {
    expect(
      normalizeMtuCatalogItem({ kind: "equipment", name: "Suction unit" }),
    ).toMatchObject({
      kind: "equipment",
      unitLabel: null,
      perClassQty: null,
      perStudentQty: null,
      rounding: null,
      requiresMileage: null,
    });
  });

  it("keeps a supply rule and no mileage flag", () => {
    expect(
      normalizeMtuCatalogItem({
        kind: "supplies",
        name: "Roller Gauze",
        unitLabel: "each",
        perClassQty: "0",
        perStudentQty: "2",
        rounding: "ceil",
      }),
    ).toMatchObject({ requiresMileage: null, perStudentQty: "2" });
  });

  it("records a transport mileage requirement and no quantity rule", () => {
    expect(
      normalizeMtuCatalogItem({
        kind: "transport",
        name: "Ford Transit Van 15 passenger",
        requiresMileage: "on",
      }),
    ).toMatchObject({
      kind: "transport",
      unitLabel: null,
      perClassQty: null,
      perStudentQty: null,
      rounding: null,
      requiresMileage: true,
    });
  });

  it("treats an unchecked transport as not requiring mileage", () => {
    expect(
      normalizeMtuCatalogItem({
        kind: "transport",
        name: "POV",
        requiresMileage: "",
      }).requiresMileage,
    ).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(() =>
      normalizeMtuCatalogItem({ kind: "spaceship", name: "X" }),
    ).toThrow();
  });

  it("requires a unit label for supplies", () => {
    expect(() =>
      normalizeMtuCatalogItem({ kind: "supplies", name: "X" }),
    ).toThrow(/unit label/i);
  });
});

import { describe, expect, it } from "vitest";

import { orderChaptersInBookOrder } from "./services";

function chapter(id: string, part: string, number: string, position: number) {
  return { id, part, number, position };
}

describe("orderChaptersInBookOrder", () => {
  it("keeps sections in catalog order, not alphabetical order", () => {
    const ordered = orderChaptersInBookOrder([
      chapter("zeta-1", "Zeta", "1", 10),
      chapter("alpha-1", "Alpha", "1", 20),
    ]);

    // "Zeta" occurs first in the catalog, so it leads despite the alphabet.
    expect(ordered.map((row) => row.id)).toEqual(["zeta-1", "alpha-1"]);
  });

  it("orders sections by first appearance and chapters numerically within them", () => {
    const ordered = orderChaptersInBookOrder([
      chapter("ff2-1", "Firefighter II", "1", 5),
      chapter("ff1-2", "Firefighter I", "2", 2),
      chapter("no-section", "", "9", 0),
      chapter("ff1-1", "Firefighter I", "1", 1),
      chapter("ff2-2", "Firefighter II", "2", 6),
    ]);

    expect(ordered.map((row) => row.id)).toEqual([
      "ff1-1",
      "ff1-2",
      "ff2-1",
      "ff2-2",
      "no-section",
    ]);
  });

  it("lists unsectioned chapters last regardless of position", () => {
    const ordered = orderChaptersInBookOrder([
      chapter("loose", "", "1", 0),
      chapter("sectioned", "Firefighter I", "1", 99),
    ]);

    expect(ordered.map((row) => row.id)).toEqual(["sectioned", "loose"]);
  });

  it("breaks a position tie by number, comparing numerically", () => {
    const ordered = orderChaptersInBookOrder([
      chapter("ten", "", "10", 0),
      chapter("two", "", "2", 0),
    ]);

    expect(ordered.map((row) => row.id)).toEqual(["two", "ten"]);
  });

  it("breaks a position and number tie by id for a stable order", () => {
    const ordered = orderChaptersInBookOrder([
      chapter("b", "", "1", 0),
      chapter("a", "", "1", 0),
    ]);

    expect(ordered.map((row) => row.id)).toEqual(["a", "b"]);
  });
});

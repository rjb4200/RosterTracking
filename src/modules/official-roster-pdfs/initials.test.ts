import { describe, expect, it } from "vitest";

import { attendeeInitials } from "./initials";

describe("attendeeInitials", () => {
  it("uses the first letters of the first and last names", () => {
    expect(attendeeInitials("Ada Lovelace")).toBe("AL");
  });

  it("ignores a middle name and extra whitespace", () => {
    expect(attendeeInitials("  Ada   Byron   Lovelace ")).toBe("AL");
  });

  it("uppercases the initials", () => {
    expect(attendeeInitials("grace hopper")).toBe("GH");
  });

  it("uses the available part for a single-part name", () => {
    expect(attendeeInitials("Prince")).toBe("P");
  });

  it("returns an empty string for a blank name", () => {
    expect(attendeeInitials("   ")).toBe("");
  });
});

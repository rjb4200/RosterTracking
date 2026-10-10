import { describe, expect, it } from "vitest";

import { AGENCY_TAG_CODES } from "./constants";
import { resolveLegacyAgencyTag } from "./legacy-agency-type";

const tags = [
  { code: AGENCY_TAG_CODES.FIRE, name: "Fire" },
  { code: AGENCY_TAG_CODES.EMS, name: "EMS" },
  { code: AGENCY_TAG_CODES.OTHER, name: "Other" },
];

describe("resolveLegacyAgencyTag", () => {
  it("matches a tag name ignoring case and surrounding whitespace", () => {
    expect(resolveLegacyAgencyTag("  fire ", tags)).toEqual({
      code: AGENCY_TAG_CODES.FIRE,
      matched: true,
    });
    expect(resolveLegacyAgencyTag("ems", tags)).toEqual({
      code: AGENCY_TAG_CODES.EMS,
      matched: true,
    });
  });

  it("falls back to Other for an unrecognised value", () => {
    expect(resolveLegacyAgencyTag("Fire Dept.", tags)).toEqual({
      code: AGENCY_TAG_CODES.OTHER,
      matched: false,
    });
  });

  it("returns null for an empty value", () => {
    expect(resolveLegacyAgencyTag("   ", tags)).toBeNull();
    expect(resolveLegacyAgencyTag(null, tags)).toBeNull();
  });
});

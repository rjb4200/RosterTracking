import { describe, expect, it } from "vitest";

import { hasMtuUsage, normalizeMtuUsage } from "./mtu";

describe("Mobile Training Unit usage", () => {
  it("normalizes blank fields to null", () => {
    expect(
      normalizeMtuUsage({
        equipmentUsed: "",
        mileage: "",
        usedSupplies: "",
      }),
    ).toEqual({ equipmentUsed: null, mileage: null, usedSupplies: null });
  });

  it("accepts partial usage", () => {
    expect(
      normalizeMtuUsage({
        equipmentUsed: "",
        mileage: " 120 ",
        usedSupplies: "",
      }),
    ).toEqual({ equipmentUsed: null, mileage: "120", usedSupplies: null });
  });

  it("trims provided values", () => {
    expect(
      normalizeMtuUsage({
        equipmentUsed: " Trailer 4 ",
        mileage: "",
        usedSupplies: "Gloves",
      }),
    ).toEqual({
      equipmentUsed: "Trailer 4",
      mileage: null,
      usedSupplies: "Gloves",
    });
  });

  it("detects whether any usage exists", () => {
    expect(
      hasMtuUsage({ equipmentUsed: null, mileage: null, usedSupplies: null }),
    ).toBe(false);
    expect(
      hasMtuUsage({ equipmentUsed: null, mileage: "1", usedSupplies: null }),
    ).toBe(true);
  });
});

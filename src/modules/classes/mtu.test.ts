import { describe, expect, it } from "vitest";

import { estimateSupplyQuantity, hasMtuUsage, normalizeMtuUsage } from "./mtu";

describe("supply quantity estimation", () => {
  it("estimates a per-class quantity", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: 1, perStudentQty: 0, rounding: "ceil" },
        18,
      ),
    ).toBe(1);
  });

  it("estimates a per-student quantity", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: 0, perStudentQty: 2, rounding: "ceil" },
        18,
      ),
    ).toBe(36);
  });

  it("rounds a per-pair fraction up", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: 0, perStudentQty: 0.5, rounding: "ceil" },
        3,
      ),
    ).toBe(2);
  });

  it("keeps an exact fractional unit", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: 0, perStudentQty: 0.25, rounding: "exact" },
        10,
      ),
    ).toBe(2.5);
  });

  it("combines a base and a rate and rounds up", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: 1, perStudentQty: 0.5, rounding: "ceil" },
        3,
      ),
    ).toBe(3);
  });

  it("treats a missing rule as zero", () => {
    expect(
      estimateSupplyQuantity(
        { perClassQty: null, perStudentQty: null, rounding: null },
        10,
      ),
    ).toBe(0);
  });
});

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
    expect(
      hasMtuUsage({
        equipmentUsed: null,
        mileage: null,
        usedSupplies: null,
        items: [{ itemId: "item", quantity: null, source: "manual" }],
      }),
    ).toBe(true);
  });
});

import { z } from "zod";

export interface MtuUsage {
  equipmentUsed: string | null;
  mileage: string | null;
  usedSupplies: string | null;
}

export const EMPTY_MTU_USAGE: MtuUsage = {
  equipmentUsed: null,
  mileage: null,
  usedSupplies: null,
};

const mtuUsageInput = z.object({
  equipmentUsed: z.string().trim().max(500).default(""),
  mileage: z.string().trim().max(200).default(""),
  usedSupplies: z.string().trim().max(500).default(""),
});

export type MtuUsageInput = z.input<typeof mtuUsageInput>;

/**
 * Mobile Training Unit usage is free text for now. Blank values are stored as
 * null so "not recorded" is distinguishable from an empty string, and partial
 * usage (for example mileage only) is allowed.
 */
export function normalizeMtuUsage(input: MtuUsageInput): MtuUsage {
  const parsed = mtuUsageInput.parse(input);
  return {
    equipmentUsed: parsed.equipmentUsed === "" ? null : parsed.equipmentUsed,
    mileage: parsed.mileage === "" ? null : parsed.mileage,
    usedSupplies: parsed.usedSupplies === "" ? null : parsed.usedSupplies,
  };
}

export function hasMtuUsage(usage: MtuUsage): boolean {
  return Boolean(usage.equipmentUsed || usage.mileage || usage.usedSupplies);
}

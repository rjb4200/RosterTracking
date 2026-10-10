import { z } from "zod";

/**
 * Free-text Mobile Training Unit usage. These fields are now the off-catalog
 * extras; structured catalog selections live in `MtuUsage.items`.
 */
export interface MtuUsageText {
  equipmentUsed: string | null;
  mileage: string | null;
  usedSupplies: string | null;
}

export const MTU_ITEM_SOURCES = {
  SUGGESTED: "suggested",
  MANUAL: "manual",
} as const;

export type MtuItemSource =
  (typeof MTU_ITEM_SOURCES)[keyof typeof MTU_ITEM_SOURCES];

export const MTU_ITEM_KINDS = {
  EQUIPMENT: "equipment",
  SUPPLIES: "supplies",
} as const;

export type MtuItemKind = (typeof MTU_ITEM_KINDS)[keyof typeof MTU_ITEM_KINDS];

/**
 * A structured catalog selection on a class, resolved with its catalog display
 * fields. Equipment has a null quantity. For supplies, `suggestion` is the
 * live estimate from the roster and `quantity` is the effective value.
 */
export interface MtuUsageItem {
  itemId: string;
  kind: MtuItemKind;
  name: string;
  unitLabel: string | null;
  quantity: number | null;
  suggestion: number | null;
  source: MtuItemSource;
}

export interface MtuUsage extends MtuUsageText {
  items: MtuUsageItem[];
}

export const EMPTY_MTU_USAGE: MtuUsage = {
  equipmentUsed: null,
  mileage: null,
  usedSupplies: null,
  items: [],
};

const mtuUsageInput = z.object({
  equipmentUsed: z.string().trim().max(500).default(""),
  mileage: z.string().trim().max(200).default(""),
  usedSupplies: z.string().trim().max(500).default(""),
});

export type MtuUsageInput = z.input<typeof mtuUsageInput>;

/**
 * Normalizes the free-text extras. Blank values are stored as null so "not
 * recorded" is distinguishable from an empty string, and partial usage (for
 * example mileage only) is allowed.
 */
export function normalizeMtuUsage(input: MtuUsageInput): MtuUsageText {
  const parsed = mtuUsageInput.parse(input);
  return {
    equipmentUsed: parsed.equipmentUsed === "" ? null : parsed.equipmentUsed,
    mileage: parsed.mileage === "" ? null : parsed.mileage,
    usedSupplies: parsed.usedSupplies === "" ? null : parsed.usedSupplies,
  };
}

export function hasMtuUsage(
  usage: MtuUsageText & { items?: readonly unknown[] },
): boolean {
  return Boolean(
    usage.equipmentUsed ||
      usage.mileage ||
      usage.usedSupplies ||
      (usage.items?.length ?? 0) > 0,
  );
}

export interface MtuConsumptionRule {
  perClassQty: number | null;
  perStudentQty: number | null;
  rounding: "ceil" | "exact" | null;
}

/**
 * Estimates a supply's quantity for a class: per-class base plus per-student
 * rate multiplied by the active participant count, then rounded. `ceil` gives
 * whole units; `exact` keeps measurable fractions (rounded to two decimals to
 * avoid floating-point noise).
 */
export function estimateSupplyQuantity(
  rule: MtuConsumptionRule,
  activeParticipants: number,
): number {
  const base = rule.perClassQty ?? 0;
  const rate = rule.perStudentQty ?? 0;
  const participants = Math.max(0, activeParticipants);
  const raw = base + rate * participants;
  if (rule.rounding === "ceil") return Math.ceil(raw);
  return Math.round(raw * 100) / 100;
}

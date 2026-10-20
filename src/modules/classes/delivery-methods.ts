import { CLASS_DELIVERY_METHODS, type ClassDeliveryMethod } from "./constants";

/** The delivery methods in canonical storage order. */
export const DELIVERY_METHOD_ORDER: readonly ClassDeliveryMethod[] = [
  CLASS_DELIVERY_METHODS.CLASSROOM,
  CLASS_DELIVERY_METHODS.HANDS_ON,
  CLASS_DELIVERY_METHODS.ONLINE,
];

const DELIVERY_METHOD_LABELS: Record<ClassDeliveryMethod, string> = {
  classroom: "Classroom",
  hands_on: "Hands-On",
  online: "Online",
};

const DELIVERY_METHOD_SET = new Set<string>(DELIVERY_METHOD_ORDER);

/**
 * Historical values that may still appear in finalized snapshots or old rows.
 * `hybrid` was the Classroom + Online shortcut.
 */
const LEGACY_DELIVERY_METHODS: Record<string, readonly ClassDeliveryMethod[]> =
  {
    hybrid: [CLASS_DELIVERY_METHODS.CLASSROOM, CLASS_DELIVERY_METHODS.ONLINE],
    in_person: [CLASS_DELIVERY_METHODS.CLASSROOM],
    virtual: [CLASS_DELIVERY_METHODS.ONLINE],
  };

export function isDeliveryMethod(value: string): value is ClassDeliveryMethod {
  return DELIVERY_METHOD_SET.has(value);
}

export function deliveryMethodLabel(method: ClassDeliveryMethod): string {
  return DELIVERY_METHOD_LABELS[method];
}

/** Parses a stored delivery value into a canonical, de-duplicated set. */
export function parseDeliveryMethods(
  value: string | null | undefined,
): ClassDeliveryMethod[] {
  if (!value) return [];
  const selected = new Set<ClassDeliveryMethod>();
  for (const raw of value.split(",")) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    const legacy = LEGACY_DELIVERY_METHODS[token];
    if (legacy) {
      for (const method of legacy) selected.add(method);
      continue;
    }
    if (isDeliveryMethod(token)) selected.add(token);
  }
  return DELIVERY_METHOD_ORDER.filter((method) => selected.has(method));
}

/** The canonical stored value for a delivery set; empty when nothing is valid. */
export function formatDeliveryMethods(
  value: string | null | undefined,
): string {
  return parseDeliveryMethods(value).join(",");
}

/** A human-readable delivery set, e.g. "Classroom + Hands-On". */
export function deliveryMethodLabels(value: string | null | undefined): string {
  return parseDeliveryMethods(value)
    .map((method) => DELIVERY_METHOD_LABELS[method])
    .join(" + ");
}

/** The KFS-1A Method checkboxes, in the order they appear on the form. */
export const KFS_METHOD_CODES = ["cr", "ho", "ol"] as const;

export type KfsMethodCode = (typeof KFS_METHOD_CODES)[number];

const KFS_METHOD_LABELS: Record<KfsMethodCode, string> = {
  cr: "CR",
  ho: "HO",
  ol: "OL",
};

const KFS_METHOD_TO_DELIVERY: Record<KfsMethodCode, ClassDeliveryMethod> = {
  cr: CLASS_DELIVERY_METHODS.CLASSROOM,
  ho: CLASS_DELIVERY_METHODS.HANDS_ON,
  ol: CLASS_DELIVERY_METHODS.ONLINE,
};

const KFS_METHOD_SET = new Set<string>(KFS_METHOD_CODES);

export function isKfsMethodCode(value: string): value is KfsMethodCode {
  return KFS_METHOD_SET.has(value);
}

export function kfsMethodLabel(code: KfsMethodCode): string {
  return KFS_METHOD_LABELS[code];
}

/** Parses a stored method value into its KFS-1A codes, in form order. */
export function parseComponentMethod(
  stored: string | null | undefined,
): KfsMethodCode[] {
  if (!stored) return [];
  const selected = new Set<KfsMethodCode>();
  for (const raw of stored.split(",")) {
    const token = raw.trim().toLowerCase();
    if (isKfsMethodCode(token)) selected.add(token);
  }
  return KFS_METHOD_CODES.filter((code) => selected.has(code));
}

/** The canonical stored method value, or null when no valid code remains. */
export function formatComponentMethod(
  stored: string | null | undefined,
): string | null {
  const codes = parseComponentMethod(stored);
  return codes.length > 0 ? codes.join(",") : null;
}

/** A human-readable method set, e.g. "CR + HO". */
export function componentMethodLabels(
  stored: string | null | undefined,
): string {
  return parseComponentMethod(stored)
    .map((code) => KFS_METHOD_LABELS[code])
    .join(" + ");
}

/**
 * Maps a class delivery set to the KFS-1A Method codes it marks. The mapping
 * is a set union: Classroom→CR, Hands-On→HO, Online→OL.
 */
export function componentMethodsForDelivery(
  deliveryMethod: string,
): KfsMethodCode[] {
  const methods = parseDeliveryMethods(deliveryMethod);
  const codes = new Set<KfsMethodCode>();
  if (methods.includes(CLASS_DELIVERY_METHODS.CLASSROOM)) codes.add("cr");
  if (methods.includes(CLASS_DELIVERY_METHODS.HANDS_ON)) codes.add("ho");
  if (methods.includes(CLASS_DELIVERY_METHODS.ONLINE)) codes.add("ol");
  return KFS_METHOD_CODES.filter((code) => codes.has(code));
}

/** The default method set for new sessions under a class delivery set. */
export function defaultComponentMethod(deliveryMethod: string): string | null {
  const codes = componentMethodsForDelivery(deliveryMethod);
  return codes.length > 0 ? codes.join(",") : null;
}

/** Derives the class-level delivery union from its actual session methods. */
export function deliveryMethodsFromComponentMethods(
  values: Iterable<string | null | undefined>,
): string {
  const selected = new Set<KfsMethodCode>();
  for (const value of values) {
    for (const code of parseComponentMethod(value)) selected.add(code);
  }
  return formatDeliveryMethods(
    KFS_METHOD_CODES.filter((code) => selected.has(code))
      .map((code) => KFS_METHOD_TO_DELIVERY[code])
      .join(","),
  );
}

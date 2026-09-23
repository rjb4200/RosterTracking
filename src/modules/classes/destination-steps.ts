/**
 * Destinations the class-creation wizard can branch on. The order here is the
 * stable order steps appear in, regardless of the order staff select them.
 */
export const DESTINATION_CODES = ["fire", "kbems", "mtu"] as const;

export type DestinationCode = (typeof DESTINATION_CODES)[number];

const DESTINATION_LABELS: Record<DestinationCode, string> = {
  fire: "Fire",
  kbems: "KBEMS",
  mtu: "MTU",
};

export interface WizardStep {
  key: "destinations" | DestinationCode | "class" | "review";
  label: string;
}

export function isDestinationCode(value: string): value is DestinationCode {
  return (DESTINATION_CODES as readonly string[]).includes(value);
}

/** Selected destinations in stable wizard order. */
export function orderedDestinationCodes(
  selected: readonly string[],
): DestinationCode[] {
  const set = new Set(selected);
  return DESTINATION_CODES.filter((code) => set.has(code));
}

export function destinationLabel(code: DestinationCode): string {
  return DESTINATION_LABELS[code];
}

/**
 * The wizard's step list: a Destinations step, one step per selected
 * destination in stable order, then the shared class-and-schedule and review
 * steps. A cleared destination contributes no step.
 */
export function buildWizardSteps(selected: readonly string[]): WizardStep[] {
  return [
    { key: "destinations", label: "Destinations" },
    ...orderedDestinationCodes(selected).map((code) => ({
      key: code,
      label: destinationLabel(code),
    })),
    { key: "class", label: "Class & schedule" },
    { key: "review", label: "Review" },
  ];
}

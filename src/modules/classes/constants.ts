export const CLASS_DELIVERY_METHODS = {
  CLASSROOM: "classroom",
  HANDS_ON: "hands_on",
  ONLINE: "online",
} as const;

/** A class delivery value is a comma-separated set of these modalities. */
export type ClassDeliveryMethod =
  (typeof CLASS_DELIVERY_METHODS)[keyof typeof CLASS_DELIVERY_METHODS];

export const CLASS_STATUSES = {
  OPEN: "open",
  FINALIZED: "finalized",
  CANCELLED: "cancelled",
} as const;

export type ClassStatus = (typeof CLASS_STATUSES)[keyof typeof CLASS_STATUSES];

/**
 * How long the class page keeps refreshing its roster after the last scheduled
 * session ends. Bounds the polling so an unattended page cannot hold the
 * database compute awake indefinitely.
 */
export const ROSTER_REFRESH_GRACE_HOURS = 4;

export type ClassStatusTone =
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "muted";

export function getClassStatusTone(status: string): ClassStatusTone {
  switch (status) {
    case CLASS_STATUSES.OPEN:
      return "info";
    case CLASS_STATUSES.FINALIZED:
      return "success";
    case CLASS_STATUSES.CANCELLED:
      return "muted";
    default:
      return "neutral";
  }
}

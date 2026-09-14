export const CLASS_DELIVERY_METHODS = {
  CLASSROOM: "classroom",
  HANDS_ON: "hands_on",
  ONLINE: "online",
  HYBRID: "hybrid",
} as const;

export type ClassDeliveryMethod =
  (typeof CLASS_DELIVERY_METHODS)[keyof typeof CLASS_DELIVERY_METHODS];

export const CLASS_STATUSES = {
  DRAFT: "draft",
  OPEN: "open",
  COMPLETED: "completed",
  FINALIZED: "finalized",
  CANCELLED: "cancelled",
} as const;

export type ClassStatus = (typeof CLASS_STATUSES)[keyof typeof CLASS_STATUSES];

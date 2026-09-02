export const CLASS_DELIVERY_METHODS = {
  IN_PERSON: "in_person",
  VIRTUAL: "virtual",
  HYBRID: "hybrid",
} as const;

export const CLASS_STATUSES = {
  DRAFT: "draft",
  OPEN: "open",
  COMPLETED: "completed",
  FINALIZED: "finalized",
  CANCELLED: "cancelled",
} as const;

export type ClassStatus = (typeof CLASS_STATUSES)[keyof typeof CLASS_STATUSES];

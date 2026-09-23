export const CREDENTIAL_TYPE_CODES = {
  FFN: "ffn",
  KEMSIS: "kemsis",
  NREMT: "nremt",
  FEMA_SID: "fema_sid",
} as const;

export const REPORTING_SYSTEM_CODES = {
  FIRE: "fire",
  KBEMS: "kbems",
  MTU: "mtu",
  FEMA: "fema",
} as const;

export const REPORTING_REQUIREMENT_KINDS = {
  CREDENTIAL: "credential",
  STUDENT_FIELD: "student_field",
} as const;

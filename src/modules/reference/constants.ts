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

export const AGENCY_TAG_CODES = {
  FIRE: "fire",
  EMS: "ems",
  LAW_ENFORCEMENT: "law_enforcement",
  OTHER: "other",
  VOLUNTEER: "volunteer",
  CAREER: "career",
} as const;

export const AGENCY_TAG_NAMES: Record<string, string> = {
  [AGENCY_TAG_CODES.FIRE]: "Fire",
  [AGENCY_TAG_CODES.EMS]: "EMS",
  [AGENCY_TAG_CODES.LAW_ENFORCEMENT]: "Law Enforcement",
  [AGENCY_TAG_CODES.OTHER]: "Other",
  [AGENCY_TAG_CODES.VOLUNTEER]: "Volunteer",
  [AGENCY_TAG_CODES.CAREER]: "Career",
};

export const AGENCY_OTHER_SUBTYPES = {
  SCHOOLS: "schools",
  HOSPITAL: "hospital",
  INDUSTRY: "industry",
  BUSINESS: "business",
  CHURCHES: "churches",
} as const;

export const AGENCY_OTHER_SUBTYPE_LABELS: Record<string, string> = {
  [AGENCY_OTHER_SUBTYPES.SCHOOLS]: "Schools",
  [AGENCY_OTHER_SUBTYPES.HOSPITAL]: "Hospital",
  [AGENCY_OTHER_SUBTYPES.INDUSTRY]: "Industry",
  [AGENCY_OTHER_SUBTYPES.BUSINESS]: "Business",
  [AGENCY_OTHER_SUBTYPES.CHURCHES]: "Churches",
};

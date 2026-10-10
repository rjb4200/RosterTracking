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

export const MTU_CATALOG_KINDS = {
  EQUIPMENT: "equipment",
  SUPPLIES: "supplies",
} as const;

export const MTU_ROUNDING_MODES = {
  CEIL: "ceil",
  EXACT: "exact",
} as const;

export type MtuCatalogKind =
  (typeof MTU_CATALOG_KINDS)[keyof typeof MTU_CATALOG_KINDS];
export type MtuRoundingMode =
  (typeof MTU_ROUNDING_MODES)[keyof typeof MTU_ROUNDING_MODES];

/** The initial Mobile Training Unit catalog. Mirrors the one-off seed
 * migration (`drizzle/0032_seed_mtu_catalog.sql`) and documents the canonical
 * starting list; the database is admin-managed after that seed. */
export const MTU_CATALOG_SEED: readonly {
  kind: MtuCatalogKind;
  name: string;
  unitLabel: string | null;
  perClassQty: number | null;
  perStudentQty: number | null;
  rounding: MtuRoundingMode | null;
  sortOrder: number;
}[] = [
  {
    kind: "equipment",
    name: "Adult HAL s5301 Mannequin",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 1,
  },
  {
    kind: "equipment",
    name: "Victoria OB/Birthing trainer",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 2,
  },
  {
    kind: "equipment",
    name: "Advanced pediatric HAL",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 3,
  },
  {
    kind: "equipment",
    name: "Portable virtual monitor",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 4,
  },
  {
    kind: "equipment",
    name: "Gaumard Ultrasound module",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 5,
  },
  {
    kind: "equipment",
    name: "Gaumard POCUS/EFAST unit",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 6,
  },
  {
    kind: "equipment",
    name: "Pediatric ultrasound POCUS/EFAST",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 7,
  },
  {
    kind: "equipment",
    name: "Ultrasound Cases",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 8,
  },
  {
    kind: "equipment",
    name: "Laryngoscope Set",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 9,
  },
  {
    kind: "equipment",
    name: "Traction Splints",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 10,
  },
  {
    kind: "equipment",
    name: "I.O. Drill",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 11,
  },
  {
    kind: "equipment",
    name: "Naloxone Trainer",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 12,
  },
  {
    kind: "equipment",
    name: "Tourniquet Trainer",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 13,
  },
  {
    kind: "equipment",
    name: "SAM junctional tourniquet Trainer",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 14,
  },
  {
    kind: "equipment",
    name: "Epi-pen trainer",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 15,
  },
  {
    kind: "equipment",
    name: "Suction unit",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 16,
  },
  {
    kind: "equipment",
    name: "Traffic Cones",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 17,
  },
  {
    kind: "equipment",
    name: "Ford Transit Van 15 passenger",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    sortOrder: 18,
  },
  {
    kind: "supplies",
    name: "Trauma Moulage Kit",
    unitLabel: "each",
    perClassQty: 1,
    perStudentQty: 0,
    rounding: "ceil",
    sortOrder: 1,
  },
  {
    kind: "supplies",
    name: "True Clot Hemorrhage training kit",
    unitLabel: "each",
    perClassQty: 1,
    perStudentQty: 0,
    rounding: "ceil",
    sortOrder: 2,
  },
  {
    kind: "supplies",
    name: "TCC/TECC training module: 2 IFAKs",
    unitLabel: "each",
    perClassQty: 0,
    perStudentQty: 0.5,
    rounding: "ceil",
    sortOrder: 3,
  },
  {
    kind: "supplies",
    name: "Tourniquet",
    unitLabel: "each",
    perClassQty: 0,
    perStudentQty: 1,
    rounding: "ceil",
    sortOrder: 4,
  },
  {
    kind: "supplies",
    name: "Simulated blood gallon",
    unitLabel: "gallon",
    perClassQty: 0,
    perStudentQty: 0.25,
    rounding: "exact",
    sortOrder: 5,
  },
  {
    kind: "supplies",
    name: "Roller Gauze",
    unitLabel: "each",
    perClassQty: 0,
    perStudentQty: 2,
    rounding: "ceil",
    sortOrder: 6,
  },
  {
    kind: "supplies",
    name: "Chest Seal",
    unitLabel: "each",
    perClassQty: 0,
    perStudentQty: 1,
    rounding: "ceil",
    sortOrder: 7,
  },
];

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

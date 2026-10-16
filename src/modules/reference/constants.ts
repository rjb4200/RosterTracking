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

/** The two kinds of training category: Fire codes and EMS categories. */
export const TRAINING_CATEGORY_KINDS = {
  FIRE: "fire",
  EMS: "ems",
} as const;

export type TrainingCategoryKind =
  (typeof TRAINING_CATEGORY_KINDS)[keyof typeof TRAINING_CATEGORY_KINDS];

/** The EMS category group that sits above the separator in the picker. */
export const EMS_CATEGORY_CORE_GROUP = "core";

/** The source revision stamped on the shipped EMS category list. */
export const EMS_CATEGORY_SOURCE_REVISION = "ems-2024";

/**
 * The initial EMS category catalog, seeded once and admin-managed afterward
 * (mirrors the MTU catalog seed). Each entry's `sortOrder` is its alphabetical
 * index within its group; the five core categories occupy the low range and sit
 * above the separator. Military TCCC courses are intentionally excluded.
 */
export const EMS_CATEGORY_SEED: readonly {
  name: string;
  categoryGroup: string | null;
  sortOrder: number;
}[] = [
  { name: "Airway", categoryGroup: EMS_CATEGORY_CORE_GROUP, sortOrder: 1 },
  { name: "Cardiology", categoryGroup: EMS_CATEGORY_CORE_GROUP, sortOrder: 2 },
  { name: "Medical", categoryGroup: EMS_CATEGORY_CORE_GROUP, sortOrder: 3 },
  { name: "Operations", categoryGroup: EMS_CATEGORY_CORE_GROUP, sortOrder: 4 },
  { name: "Trauma", categoryGroup: EMS_CATEGORY_CORE_GROUP, sortOrder: 5 },
  { name: "Advanced Burn Life Support", categoryGroup: null, sortOrder: 1 },
  { name: "Advanced Cardiac Life Support", categoryGroup: null, sortOrder: 2 },
  { name: "Advanced Disaster Life Support", categoryGroup: null, sortOrder: 3 },
  { name: "Advanced Life Support", categoryGroup: null, sortOrder: 4 },
  { name: "Advanced Medical Life Support", categoryGroup: null, sortOrder: 5 },
  {
    name: "Advanced Pediatric Life Support",
    categoryGroup: null,
    sortOrder: 6,
  },
  { name: "Advanced Stroke Life Support", categoryGroup: null, sortOrder: 7 },
  { name: "Advanced Trauma Life Support", categoryGroup: null, sortOrder: 8 },
  {
    name: "All Hazards Disaster Life Support",
    categoryGroup: null,
    sortOrder: 9,
  },
  {
    name: "An Introduction to the Incident Command System, ICS 100",
    categoryGroup: null,
    sortOrder: 10,
  },
  {
    name: "An Introduction to the National Incident Management System",
    categoryGroup: null,
    sortOrder: 11,
  },
  { name: "Basic Disaster Life Support", categoryGroup: null, sortOrder: 12 },
  { name: "CPR - Healthcare Professional", categoryGroup: null, sortOrder: 13 },
  {
    name: "Emergency Medical Patients: Assessment, Care and Transport",
    categoryGroup: null,
    sortOrder: 14,
  },
  {
    name: "Emergency Neurological Life Support",
    categoryGroup: null,
    sortOrder: 15,
  },
  { name: "Emergency Pediatric Course", categoryGroup: null, sortOrder: 16 },
  {
    name: "Emergency Vehicle Operator Course / Safety",
    categoryGroup: null,
    sortOrder: 17,
  },
  { name: "EMS Safety", categoryGroup: null, sortOrder: 18 },
  { name: "Geriatric Education for EMS", categoryGroup: null, sortOrder: 19 },
  { name: "Hazardous Materials Awareness", categoryGroup: null, sortOrder: 20 },
  {
    name: "Hazardous Materials Operations",
    categoryGroup: null,
    sortOrder: 21,
  },
  {
    name: "Hazardous Materials Technician",
    categoryGroup: null,
    sortOrder: 22,
  },
  {
    name: "ICS 300: Intermediate Incident Command System for Expanding Incidents",
    categoryGroup: null,
    sortOrder: 23,
  },
  {
    name: "ICS 400: Advanced Incident Command System for Command and General Staff - Complex Incidents",
    categoryGroup: null,
    sortOrder: 24,
  },
  {
    name: "International Trauma Life Support",
    categoryGroup: null,
    sortOrder: 25,
  },
  {
    name: "IS-700.B: An Introduction to the National Incident Management System",
    categoryGroup: null,
    sortOrder: 26,
  },
  {
    name: "IS-800.D: National Response Framework, An Introduction",
    categoryGroup: null,
    sortOrder: 27,
  },
  {
    name: "Neonatal Resuscitation Program",
    categoryGroup: null,
    sortOrder: 28,
  },
  {
    name: "Pediatric Advanced Life Support",
    categoryGroup: null,
    sortOrder: 29,
  },
  {
    name: "Pediatric Education for Prehospital Professionals",
    categoryGroup: null,
    sortOrder: 30,
  },
  {
    name: "Pediatric Emergency Assessment, Recognition and Stabilization",
    categoryGroup: null,
    sortOrder: 31,
  },
  {
    name: "Prehospital Trauma Life Support",
    categoryGroup: null,
    sortOrder: 32,
  },
  {
    name: "Tactical Emergency Casualty Care (Civilian)",
    categoryGroup: null,
    sortOrder: 33,
  },
  { name: "Traffic Incident Management", categoryGroup: null, sortOrder: 34 },
];

/** Matching Fire code ↔ EMS category pairs, seeded symmetrically. */
export const EMS_FIRE_CATEGORY_MAP: readonly {
  fireCode: string;
  emsName: string;
}[] = [
  { fireCode: "P0008", emsName: "Airway" },
  { fireCode: "P0011", emsName: "Trauma" },
  { fireCode: "P0014", emsName: "Operations" },
  { fireCode: "P0023", emsName: "Cardiology" },
  { fireCode: "P0010", emsName: "Medical" },
  { fireCode: "P0001", emsName: "CPR - Healthcare Professional" },
  { fireCode: "P0015", emsName: "Advanced Cardiac Life Support" },
  { fireCode: "P0017", emsName: "Pediatric Advanced Life Support" },
  { fireCode: "T0001", emsName: "Hazardous Materials Awareness" },
  { fireCode: "T0002", emsName: "Hazardous Materials Operations" },
  { fireCode: "T0003", emsName: "Hazardous Materials Technician" },
  {
    fireCode: "FF0001",
    emsName: "An Introduction to the Incident Command System, ICS 100",
  },
  {
    fireCode: "FF0002",
    emsName: "An Introduction to the National Incident Management System",
  },
  {
    fireCode: "FF0003",
    emsName:
      "ICS 300: Intermediate Incident Command System for Expanding Incidents",
  },
  {
    fireCode: "FF0004",
    emsName:
      "ICS 400: Advanced Incident Command System for Command and General Staff - Complex Incidents",
  },
  {
    fireCode: "FF0007",
    emsName:
      "IS-700.B: An Introduction to the National Incident Management System",
  },
  {
    fireCode: "FF0008",
    emsName: "IS-800.D: National Response Framework, An Introduction",
  },
];

export const MTU_CATALOG_KINDS = {
  EQUIPMENT: "equipment",
  SUPPLIES: "supplies",
  TRANSPORT: "transport",
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
 * migrations (`drizzle/0032_seed_mtu_catalog.sql`,
 * `drizzle/0038_mtu_transport_seed.sql`) and documents the canonical starting
 * list; the database is admin-managed after that seed. Only transport entries
 * set `requiresMileage`; equipment and supplies leave it unset (null). */
export const MTU_CATALOG_SEED: readonly {
  kind: MtuCatalogKind;
  name: string;
  unitLabel: string | null;
  perClassQty: number | null;
  perStudentQty: number | null;
  rounding: MtuRoundingMode | null;
  requiresMileage?: boolean;
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
    kind: "transport",
    name: "Ford Transit Van 15 passenger",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    requiresMileage: true,
    sortOrder: 1,
  },
  {
    kind: "transport",
    name: "Department vehicle",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    requiresMileage: true,
    sortOrder: 2,
  },
  {
    kind: "transport",
    name: "POV",
    unitLabel: null,
    perClassQty: null,
    perStudentQty: null,
    rounding: null,
    requiresMileage: false,
    sortOrder: 3,
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

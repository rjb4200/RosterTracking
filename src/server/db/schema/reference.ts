import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentNumber: text("student_number"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("students_phone_unique").on(table.phone),
    uniqueIndex("students_number_unique")
      .on(table.studentNumber)
      .where(sql`${table.studentNumber} is not null`),
    index("students_name_idx").on(table.lastName, table.firstName),
  ],
);

export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("agencies_name_idx").on(table.name)],
);

export const studentAgencies = pgTable(
  "student_agencies",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.studentId, table.agencyId] }),
    index("student_agencies_agency_idx").on(table.agencyId),
    uniqueIndex("student_agencies_primary_unique")
      .on(table.studentId)
      .where(sql`${table.isPrimary} and ${table.isActive}`),
  ],
);

export const credentialTypes = pgTable(
  "credential_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    issuer: text("issuer"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("credential_types_code_unique").on(table.code)],
);

export const studentCredentials = pgTable(
  "student_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    credentialTypeId: uuid("credential_type_id")
      .notNull()
      .references(() => credentialTypes.id, { onDelete: "restrict" }),
    value: text("value").notNull(),
    valueHash: text("value_hash").notNull(),
    maskedSuffix: text("masked_suffix").notNull(),
    expirationDate: date("expiration_date"),
    verificationStatus: text("verification_status"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("student_credentials_student_type_unique").on(
      table.studentId,
      table.credentialTypeId,
    ),
    uniqueIndex("student_credentials_type_value_unique").on(
      table.credentialTypeId,
      table.valueHash,
    ),
    index("student_credentials_student_idx").on(table.studentId),
  ],
);

export const reportingSystems = pgTable(
  "reporting_systems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("reporting_systems_code_unique").on(table.code)],
);

export const reportingRequirementSets = pgTable(
  "reporting_requirement_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportingSystemId: uuid("reporting_system_id")
      .notNull()
      .references(() => reportingSystems.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .defaultNow()
      .notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reporting_requirement_sets_system_version_unique").on(
      table.reportingSystemId,
      table.version,
    ),
    uniqueIndex("reporting_requirement_sets_active_unique")
      .on(table.reportingSystemId)
      .where(sql`${table.isActive}`),
  ],
);

export const reportingRequirements = pgTable(
  "reporting_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requirementSetId: uuid("requirement_set_id")
      .notNull()
      .references(() => reportingRequirementSets.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    credentialTypeId: uuid("credential_type_id").references(
      () => credentialTypes.id,
      { onDelete: "restrict" },
    ),
    studentField: text("student_field"),
    isRequired: boolean("is_required").default(true).notNull(),
  },
  (table) => [
    index("reporting_requirements_set_idx").on(table.requirementSetId),
    check(
      "reporting_requirements_target",
      sql`(${table.kind} = 'credential' and ${table.credentialTypeId} is not null and ${table.studentField} is null) or (${table.kind} = 'student_field' and ${table.studentField} is not null and ${table.credentialTypeId} is null)`,
    ),
  ],
);

export const trainingCodes = pgTable(
  "training_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    sourceRevision: text("source_revision").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("training_codes_code_revision_unique").on(
      table.code,
      table.sourceRevision,
    ),
    index("training_codes_code_idx").on(table.code),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    defaultHours: numeric("default_hours", { precision: 5, scale: 2 }),
    trainingCodeId: uuid("training_code_id").references(
      () => trainingCodes.id,
      {
        onDelete: "set null",
      },
    ),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("courses_name_idx").on(table.name)],
);

export const courseReportingDefaults = pgTable(
  "course_reporting_defaults",
  {
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    reportingSystemId: uuid("reporting_system_id")
      .notNull()
      .references(() => reportingSystems.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.reportingSystemId] }),
  ],
);

export const trainingSites = pgTable(
  "training_sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("training_sites_name_idx").on(table.name)],
);

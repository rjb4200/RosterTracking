import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
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
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    isActive: boolean("is_active").default(true).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("agencies_name_idx").on(table.name),
    uniqueIndex("agencies_name_unique").on(sql`lower(btrim(${table.name}))`),
    check(
      "agencies_archived_state",
      sql`${table.archivedAt} is null or not ${table.isActive}`,
    ),
  ],
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
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("training_codes_code_revision_unique").on(
      table.code,
      table.sourceRevision,
    ),
    index("training_codes_code_idx").on(table.code),
    check(
      "training_codes_archived_state",
      sql`${table.archivedAt} is null or not ${table.isActive}`,
    ),
  ],
);

export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publisher: text("publisher").notNull(),
    programTitle: text("program_title").notNull(),
    version: text("version"),
    additionalRequirements: text("additional_requirements"),
    sourceRevision: text("source_revision").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("curricula_identity_unique").on(
      table.publisher,
      table.programTitle,
      table.sourceRevision,
    ),
    index("curricula_publisher_idx").on(table.publisher),
    check(
      "curricula_archived_state",
      sql`${table.archivedAt} is null or not ${table.isActive}`,
    ),
  ],
);

export const curriculumChapters = pgTable(
  "curriculum_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumId: uuid("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    // The optional section a chapter belongs to (for example "Firefighter I").
    // Stored as an empty string when the book has no sections so the identity
    // index can reliably upsert on curriculum, section, and number.
    part: text("part").default("").notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    position: integer("position").default(0).notNull(),
    sourceRevision: text("source_revision").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("curriculum_chapters_identity_unique").on(
      table.curriculumId,
      table.part,
      table.number,
    ),
    index("curriculum_chapters_curriculum_position_idx").on(
      table.curriculumId,
      table.position,
    ),
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
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("training_sites_name_idx").on(table.name),
    check(
      "training_sites_archived_state",
      sql`${table.archivedAt} is null or not ${table.isActive}`,
    ),
  ],
);

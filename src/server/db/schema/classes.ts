import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { courses, reportingSystems, trainingSites } from "./reference";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const trainingClasses = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    trainingSiteId: uuid("training_site_id").references(
      () => trainingSites.id,
      { onDelete: "restrict" },
    ),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deliveryMethod: text("delivery_method").notNull(),
    status: text("status").default("draft").notNull(),
    signInTokenHash: text("sign_in_token_hash").notNull(),
    signInTokenVersion: integer("sign_in_token_version").default(1).notNull(),
    cancellationReason: text("cancellation_reason"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("classes_course_idx").on(table.courseId),
    index("classes_site_idx").on(table.trainingSiteId),
    index("classes_creator_status_idx").on(table.createdByUserId, table.status),
    index("classes_status_idx").on(table.status),
    uniqueIndex("classes_sign_in_token_hash_unique").on(table.signInTokenHash),
    check(
      "classes_sign_in_token_version_positive",
      sql`${table.signInTokenVersion} > 0`,
    ),
    check(
      "classes_delivery_method",
      sql`${table.deliveryMethod} in ('in_person', 'virtual', 'hybrid')`,
    ),
    check(
      "classes_status",
      sql`${table.status} in ('draft', 'open', 'completed', 'finalized', 'cancelled')`,
    ),
    check(
      "classes_site_required",
      sql`${table.deliveryMethod} = 'virtual' or ${table.trainingSiteId} is not null`,
    ),
    check(
      "classes_cancellation_reason",
      sql`${table.status} <> 'cancelled' or nullif(btrim(${table.cancellationReason}), '') is not null`,
    ),
  ],
);

export const classComponents = pgTable(
  "class_components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "cascade" }),
    title: text("title"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    creditedHours: numeric("credited_hours", {
      precision: 5,
      scale: 2,
    }).notNull(),
    position: integer("position").default(0).notNull(),
    ...timestamps,
  },
  (table) => [
    index("class_components_class_schedule_idx").on(
      table.classId,
      table.startsAt,
    ),
    check(
      "class_components_time_range",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check("class_components_hours_positive", sql`${table.creditedHours} > 0`),
  ],
);

export const classInstructors = pgTable(
  "class_instructors",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isLead: boolean("is_lead").default(false).notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.classId, table.userId] }),
    index("class_instructors_user_idx").on(table.userId),
    uniqueIndex("class_instructors_lead_unique")
      .on(table.classId)
      .where(sql`${table.isLead}`),
  ],
);

export const classReportingSystems = pgTable(
  "class_reporting_systems",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "cascade" }),
    reportingSystemId: uuid("reporting_system_id")
      .notNull()
      .references(() => reportingSystems.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.classId, table.reportingSystemId] }),
    index("class_reporting_systems_system_idx").on(table.reportingSystemId),
  ],
);

export const finalizationRevisions = pgTable(
  "finalization_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    finalizedByUserId: uuid("finalized_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // The encrypted payload keeps historical roster facts out of normal reads.
    encryptedSnapshot: text("encrypted_snapshot").notNull(),
    summary: jsonb("summary").notNull(),
  },
  (table) => [
    uniqueIndex("finalization_revisions_class_number_unique").on(
      table.classId,
      table.revisionNumber,
    ),
    index("finalization_revisions_class_finalized_idx").on(
      table.classId,
      table.finalizedAt,
    ),
    check(
      "finalization_revisions_number_positive",
      sql`${table.revisionNumber} > 0`,
    ),
    check(
      "finalization_revisions_snapshot_not_blank",
      sql`length(btrim(${table.encryptedSnapshot})) > 0`,
    ),
  ],
);

export const finalizationReopens = pgTable(
  "finalization_reopens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => finalizationRevisions.id, { onDelete: "restrict" }),
    reopenedByUserId: uuid("reopened_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    reopenedAt: timestamp("reopened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("finalization_reopens_revision_unique").on(table.revisionId),
    check(
      "finalization_reopens_reason_not_blank",
      sql`length(btrim(${table.reason})) > 0`,
    ),
  ],
);

export const finalizationReportingStatuses = pgTable(
  "finalization_reporting_statuses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => finalizationRevisions.id, { onDelete: "restrict" }),
    reportingSystemId: uuid("reporting_system_id")
      .notNull()
      .references(() => reportingSystems.id, { onDelete: "restrict" }),
    status: text("status").default("pending").notNull(),
    reportedByUserId: uuid("reported_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    referenceNumber: text("reference_number"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("finalization_reporting_revision_system_unique").on(
      table.revisionId,
      table.reportingSystemId,
    ),
    index("finalization_reporting_status_idx").on(
      table.status,
      table.updatedAt,
    ),
    check(
      "finalization_reporting_status_valid",
      sql`${table.status} in ('pending', 'reported', 'needs_correction')`,
    ),
  ],
);

export const officialRosterArtifacts = pgTable(
  "official_roster_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => finalizationRevisions.id, { onDelete: "restrict" }),
    formType: text("form_type").notNull(),
    templateVersion: text("template_version").notNull(),
    objectKey: text("object_key").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    generatedByUserId: uuid("generated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("official_roster_artifacts_object_key_unique").on(
      table.objectKey,
    ),
    index("official_roster_artifacts_revision_generated_idx").on(
      table.revisionId,
      table.generatedAt,
    ),
    check(
      "official_roster_artifacts_form_type",
      sql`${table.formType} in ('kfs-1a', 'kbems-e16')`,
    ),
    check(
      "official_roster_artifacts_object_key_not_blank",
      sql`length(btrim(${table.objectKey})) > 0`,
    ),
    check(
      "official_roster_artifacts_checksum_sha256",
      sql`${table.checksum} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "official_roster_artifacts_byte_size_positive",
      sql`${table.byteSize} > 0`,
    ),
  ],
);

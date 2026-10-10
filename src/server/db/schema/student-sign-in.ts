import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { trainingClasses } from "./classes";
import {
  agencies,
  credentialTypes,
  reportingRequirementSets,
  students,
} from "./reference";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const rememberedDevices = pgTable(
  "remembered_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("remembered_devices_token_hash_unique").on(table.tokenHash),
    index("remembered_devices_student_idx").on(table.studentId),
    index("remembered_devices_expires_idx").on(table.expiresAt),
    index("remembered_devices_student_active_idx")
      .on(table.studentId, table.expiresAt)
      .where(sql`${table.revokedAt} is null`),
    check(
      "remembered_devices_token_hash_not_blank",
      sql`length(btrim(${table.tokenHash})) > 0`,
    ),
    check(
      "remembered_devices_expiration_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "remembered_devices_last_used_after_creation",
      sql`${table.lastUsedAt} is null or ${table.lastUsedAt} >= ${table.createdAt}`,
    ),
    check(
      "remembered_devices_revoked_after_creation",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const publicRateLimitWindows = pgTable(
  "public_rate_limit_windows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(),
    requestSourceFingerprint: text("request_source_fingerprint").notNull(),
    identifierFingerprint: text("identifier_fingerprint").notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("public_rate_limit_windows_key_unique").on(
      table.classId,
      table.operation,
      table.requestSourceFingerprint,
      table.identifierFingerprint,
      table.windowStartedAt,
    ),
    index("public_rate_limit_windows_expires_idx").on(table.expiresAt),
    index("public_rate_limit_windows_source_idx").on(
      table.classId,
      table.operation,
      table.requestSourceFingerprint,
      table.windowStartedAt,
    ),
    index("public_rate_limit_windows_identifier_idx").on(
      table.classId,
      table.operation,
      table.identifierFingerprint,
      table.windowStartedAt,
    ),
    check(
      "public_rate_limit_windows_operation_not_blank",
      sql`length(btrim(${table.operation})) > 0`,
    ),
    check(
      "public_rate_limit_windows_source_not_blank",
      sql`length(btrim(${table.requestSourceFingerprint})) > 0`,
    ),
    check(
      "public_rate_limit_windows_identifier_not_blank",
      sql`length(btrim(${table.identifierFingerprint})) > 0`,
    ),
    check(
      "public_rate_limit_windows_expiration",
      sql`${table.expiresAt} > ${table.windowStartedAt}`,
    ),
    check(
      "public_rate_limit_windows_counts_nonnegative",
      sql`${table.attemptCount} >= 0 and ${table.failureCount} >= 0 and ${table.failureCount} <= ${table.attemptCount}`,
    ),
  ],
);

export const signInWorkflowStaging = pgTable(
  "sign_in_workflow_staging",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "cascade" }),
    nonceHash: text("nonce_hash").notNull(),
    signInTokenVersion: integer("sign_in_token_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    encryptedState: text("encrypted_state").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sign_in_workflow_staging_nonce_hash_unique").on(
      table.nonceHash,
    ),
    uniqueIndex("sign_in_workflow_staging_class_idempotency_unique").on(
      table.classId,
      table.idempotencyKey,
    ),
    index("sign_in_workflow_staging_expires_idx").on(table.expiresAt),
    index("sign_in_workflow_staging_class_idx").on(
      table.classId,
      table.expiresAt,
    ),
    check(
      "sign_in_workflow_staging_nonce_not_blank",
      sql`length(btrim(${table.nonceHash})) > 0`,
    ),
    check(
      "sign_in_workflow_staging_idempotency_not_blank",
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "sign_in_workflow_staging_encrypted_state_not_blank",
      sql`length(btrim(${table.encryptedState})) > 0`,
    ),
    check(
      "sign_in_workflow_staging_token_version_positive",
      sql`${table.signInTokenVersion} > 0`,
    ),
    check(
      "sign_in_workflow_staging_expiration_after_creation",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "sign_in_workflow_staging_consumed_after_creation",
      sql`${table.consumedAt} is null or ${table.consumedAt} >= ${table.createdAt}`,
    ),
  ],
);

export const classGuests = pgTable(
  "class_guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "restrict" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    // Collected so the guest can receive a completion certificate. Nullable for
    // rows created before guest email was required.
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("class_guests_id_class_unique").on(table.id, table.classId),
    index("class_guests_class_name_idx").on(
      table.classId,
      table.lastName,
      table.firstName,
    ),
    check(
      "class_guests_first_name_not_blank",
      sql`length(btrim(${table.firstName})) > 0`,
    ),
    check(
      "class_guests_last_name_not_blank",
      sql`length(btrim(${table.lastName})) > 0`,
    ),
  ],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id")
      .notNull()
      .references(() => trainingClasses.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "restrict",
    }),
    guestId: uuid("guest_id"),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadFingerprint: text("payload_fingerprint").notNull(),
    signedInAt: timestamp("signed_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedByUserId: uuid("removed_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    removalReason: text("removal_reason"),
    creditedHours: numeric("credited_hours", {
      precision: 5,
      scale: 2,
    }).notNull(),
    creditAdjustmentReason: text("credit_adjustment_reason"),
    creditAdjustedByUserId: uuid("credit_adjusted_by_user_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    creditAdjustedAt: timestamp("credit_adjusted_at", { withTimezone: true }),
    isManual: boolean("is_manual").default(false).notNull(),
    manualRecordedByUserId: uuid("manual_recorded_by_user_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.guestId, table.classId],
      foreignColumns: [classGuests.id, classGuests.classId],
      name: "attendance_guest_class_fk",
    }).onDelete("restrict"),
    uniqueIndex("attendance_class_idempotency_unique").on(
      table.classId,
      table.idempotencyKey,
    ),
    uniqueIndex("attendance_active_class_student_unique")
      .on(table.classId, table.studentId)
      .where(
        sql`${table.removedAt} is null and ${table.studentId} is not null`,
      ),
    index("attendance_class_signed_in_idx").on(table.classId, table.signedInAt),
    index("attendance_student_idx").on(table.studentId),
    index("attendance_guest_idx").on(table.guestId),
    index("attendance_agency_idx").on(table.agencyId),
    index("attendance_removed_idx").on(table.classId, table.removedAt),
    index("attendance_roster_active_idx")
      .on(table.classId, table.signedInAt)
      .where(sql`${table.removedAt} is null`),
    check(
      "attendance_participant_xor",
      sql`(${table.studentId} is not null) <> (${table.guestId} is not null)`,
    ),
    check(
      "attendance_idempotency_not_blank",
      sql`length(btrim(${table.idempotencyKey})) > 0`,
    ),
    check(
      "attendance_payload_fingerprint_not_blank",
      sql`length(btrim(${table.payloadFingerprint})) > 0`,
    ),
    check(
      "attendance_removal_fields",
      sql`(${table.removedAt} is null and ${table.removedByUserId} is null and ${table.removalReason} is null) or (${table.removedAt} is not null and ${table.removedByUserId} is not null and nullif(btrim(${table.removalReason}), '') is not null)`,
    ),
    check(
      "attendance_removed_after_sign_in",
      sql`${table.removedAt} is null or ${table.removedAt} >= ${table.signedInAt}`,
    ),
    check(
      "attendance_credited_hours_nonnegative",
      sql`${table.creditedHours} >= 0`,
    ),
    check(
      "attendance_credit_adjustment_fields",
      sql`(${table.creditAdjustmentReason} is null and ${table.creditAdjustedByUserId} is null and ${table.creditAdjustedAt} is null) or (nullif(btrim(${table.creditAdjustmentReason}), '') is not null and ${table.creditAdjustedByUserId} is not null and ${table.creditAdjustedAt} is not null)`,
    ),
    check(
      "attendance_manual_fields",
      sql`(${table.isManual} = false and ${table.manualRecordedByUserId} is null) or (${table.isManual} = true and ${table.manualRecordedByUserId} is not null)`,
    ),
  ],
);

export const attendanceAttestations = pgTable(
  "attendance_attestations",
  {
    attendanceId: uuid("attendance_id")
      .primaryKey()
      .references(() => attendance.id, { onDelete: "restrict" }),
    renderedText: text("rendered_text").notNull(),
    textVersion: integer("text_version").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    signInMethod: text("sign_in_method").notNull(),
    originatingIp: text("originating_ip").notNull(),
    requestSourceFingerprint: text("request_source_fingerprint").notNull(),
    requestCorrelationId: text("request_correlation_id").notNull(),
    rememberedDeviceId: uuid("remembered_device_id").references(
      () => rememberedDevices.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    index("attendance_attestations_remembered_device_idx").on(
      table.rememberedDeviceId,
    ),
    check(
      "attendance_attestations_text_not_blank",
      sql`length(btrim(${table.renderedText})) > 0`,
    ),
    check(
      "attendance_attestations_text_version_positive",
      sql`${table.textVersion} > 0`,
    ),
    check(
      "attendance_attestations_method_not_blank",
      sql`length(btrim(${table.signInMethod})) > 0`,
    ),
    check(
      "attendance_attestations_ip_not_blank",
      sql`length(btrim(${table.originatingIp})) > 0`,
    ),
    check(
      "attendance_attestations_source_not_blank",
      sql`length(btrim(${table.requestSourceFingerprint})) > 0`,
    ),
    check(
      "attendance_attestations_correlation_not_blank",
      sql`length(btrim(${table.requestCorrelationId})) > 0`,
    ),
  ],
);

export const attendanceReportingContexts = pgTable(
  "attendance_reporting_contexts",
  {
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendance.id, { onDelete: "restrict" }),
    requirementSetId: uuid("requirement_set_id")
      .notNull()
      .references(() => reportingRequirementSets.id, { onDelete: "restrict" }),
    included: boolean("included").default(true).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.attendanceId, table.requirementSetId] }),
    index("attendance_reporting_contexts_requirement_set_idx").on(
      table.requirementSetId,
    ),
  ],
);

export const attendanceRequiredFieldSnapshots = pgTable(
  "attendance_required_field_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attendanceId: uuid("attendance_id").notNull(),
    requirementSetId: uuid("requirement_set_id").notNull(),
    studentField: text("student_field").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.attendanceId, table.requirementSetId],
      foreignColumns: [
        attendanceReportingContexts.attendanceId,
        attendanceReportingContexts.requirementSetId,
      ],
      name: "attendance_required_field_snapshots_context_fk",
    }).onDelete("restrict"),
    uniqueIndex("attendance_required_field_snapshots_value_unique").on(
      table.attendanceId,
      table.requirementSetId,
      table.studentField,
    ),
    index("attendance_required_field_snapshots_attendance_idx").on(
      table.attendanceId,
    ),
    check(
      "attendance_required_field_snapshots_field_not_blank",
      sql`length(btrim(${table.studentField})) > 0`,
    ),
    check(
      "attendance_required_field_snapshots_value_not_blank",
      sql`length(btrim(${table.encryptedValue})) > 0`,
    ),
  ],
);

export const attendanceCredentialSnapshots = pgTable(
  "attendance_credential_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attendanceId: uuid("attendance_id").notNull(),
    requirementSetId: uuid("requirement_set_id").notNull(),
    credentialTypeId: uuid("credential_type_id")
      .notNull()
      .references(() => credentialTypes.id, { onDelete: "restrict" }),
    encryptedValue: text("encrypted_value").notNull(),
    maskedSuffix: text("masked_suffix").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.attendanceId, table.requirementSetId],
      foreignColumns: [
        attendanceReportingContexts.attendanceId,
        attendanceReportingContexts.requirementSetId,
      ],
      name: "attendance_credential_snapshots_context_fk",
    }).onDelete("restrict"),
    uniqueIndex("attendance_credential_snapshots_value_unique").on(
      table.attendanceId,
      table.requirementSetId,
      table.credentialTypeId,
    ),
    index("attendance_credential_snapshots_attendance_idx").on(
      table.attendanceId,
    ),
    index("attendance_credential_snapshots_type_idx").on(
      table.credentialTypeId,
    ),
    check(
      "attendance_credential_snapshots_value_not_blank",
      sql`length(btrim(${table.encryptedValue})) > 0`,
    ),
    check(
      "attendance_credential_snapshots_suffix_not_blank",
      sql`length(btrim(${table.maskedSuffix})) > 0`,
    ),
  ],
);

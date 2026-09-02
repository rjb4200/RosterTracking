import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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

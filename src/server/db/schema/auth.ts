import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    failedLoginCount: integer("failed_login_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    sessionVersion: integer("session_version").default(1).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ffn: text("ffn"),
    instructorLevel: integer("instructor_level"),
    emsProviderNumber: text("ems_provider_number"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    index("users_active_idx").on(table.isActive),
    check(
      "users_username_normalized",
      sql`${table.username} = lower(btrim(${table.username}))`,
    ),
    check(
      "users_failed_login_count_nonnegative",
      sql`${table.failedLoginCount} >= 0`,
    ),
    check("users_session_version_positive", sql`${table.sessionVersion} > 0`),
    check(
      "users_ffn_format",
      // Legacy digits-only values remain until the owner corrects their profile.
      sql`${table.ffn} is null or ${table.ffn} ~ '^([0-9]+|[0-9]{4}-[0-9]{4})$'`,
    ),
    check(
      "users_archived_state",
      sql`${table.archivedAt} is null or not ${table.isActive}`,
    ),
    check(
      "users_instructor_level_valid",
      sql`${table.instructorLevel} is null or ${table.instructorLevel} in (1, 2, 3)`,
    ),
    uniqueIndex("users_ffn_unique")
      .on(table.ffn)
      .where(sql`${table.ffn} is not null`),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("roles_code_unique").on(table.code)],
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("permissions_code_unique").on(table.code)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_role_idx").on(table.roleId),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "restrict" }),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_permission_idx").on(table.permissionId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    ipAddress: text("ip_address"),
    details: jsonb("details")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_entity_time_idx").on(
      table.entityType,
      table.entityId,
      table.occurredAt,
    ),
    index("audit_logs_actor_time_idx").on(table.actorUserId, table.occurredAt),
    check(
      "audit_logs_actor_type",
      sql`${table.actorType} in ('user', 'system')`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

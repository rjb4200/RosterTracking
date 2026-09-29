import "server-only";

import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import { assertClassRosterAccess } from "@/modules/instructor-roster/services";
import type { Database, DatabaseTransaction } from "@/server/db/client";
import {
  auditLogs,
  finalizationRevisions,
  trainingClasses,
  trainingSites,
  users,
} from "@/server/db/schema";

export interface ClassAuditLogActor {
  id: string;
  username: string;
}

export interface ClassAuditLogEntry {
  id: string;
  occurredAt: Date;
  actorType: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  details: Record<string, unknown>;
  revisionNumber: number | null;
}

export interface ClassAuditLog {
  classId: string;
  className: string;
  siteName: string | null;
  status: string;
  generatedAt: Date;
  entries: ClassAuditLogEntry[];
}

/**
 * Reads the append-only audit trail scoped to one class. Audit rows carry no
 * class id, so the trail is assembled from three predicates: events keyed to
 * the class itself, events whose details record the class id (attendance and
 * sign-in), and events keyed to any of the class's finalization revisions.
 */
export async function getClassAuditLog(
  db: Database,
  actor: ClassAuditLogActor,
  classId: string,
): Promise<ClassAuditLog> {
  return db.transaction(async (transaction) => {
    await assertClassRosterAccess(transaction, actor, classId);
    const classRow = await readClass(transaction, classId);
    if (!classRow) throw new Error("Class audit log unavailable.");
    const revisionRows = await transaction
      .select({
        id: finalizationRevisions.id,
        revisionNumber: finalizationRevisions.revisionNumber,
      })
      .from(finalizationRevisions)
      .where(eq(finalizationRevisions.classId, classId));
    const revisionNumbers = new Map(
      revisionRows.map((row) => [row.id, row.revisionNumber]),
    );
    const revisionIds = revisionRows.map((row) => row.id);

    const rows = await transaction
      .select({
        id: auditLogs.id,
        occurredAt: auditLogs.occurredAt,
        actorType: auditLogs.actorType,
        actorName: users.displayName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        ipAddress: auditLogs.ipAddress,
        details: auditLogs.details,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(
        or(
          and(
            eq(auditLogs.entityType, "class"),
            eq(auditLogs.entityId, classId),
          ),
          sql`${auditLogs.details}->>'classId' = ${classId}`,
          revisionIds.length > 0
            ? inArray(auditLogs.entityId, revisionIds)
            : undefined,
        ),
      )
      .orderBy(asc(auditLogs.occurredAt));

    return {
      ...classRow,
      generatedAt: new Date(),
      entries: rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurredAt,
        actorType: row.actorType,
        actorName: row.actorName ?? "System",
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        details: row.details ?? {},
        revisionNumber:
          row.entityType === "finalization_revision" && row.entityId
            ? (revisionNumbers.get(row.entityId) ?? null)
            : null,
      })),
    };
  });
}

async function readClass(
  transaction: DatabaseTransaction,
  classId: string,
): Promise<Omit<ClassAuditLog, "generatedAt" | "entries"> | undefined> {
  const [classRow] = await transaction
    .select({
      classId: trainingClasses.id,
      className: sql<string>`coalesce(${trainingClasses.name}, '')`,
      siteName: trainingSites.name,
      status: trainingClasses.status,
    })
    .from(trainingClasses)
    .leftJoin(
      trainingSites,
      eq(trainingSites.id, trainingClasses.trainingSiteId),
    )
    .where(eq(trainingClasses.id, classId))
    .limit(1);
  return classRow;
}

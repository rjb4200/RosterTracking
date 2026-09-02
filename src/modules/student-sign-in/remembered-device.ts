import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import type { Database, DatabaseTransaction } from "@/server/db/client";
import { rememberedDevices, students } from "@/server/db/schema";

import { SIGN_IN_COOKIE_PATH } from "./context";

export const REMEMBERED_DEVICE_COOKIE_NAME = "roster_remembered_student";
export const REMEMBERED_DEVICE_TTL_SECONDS = 180 * 24 * 60 * 60;

export function generateRememberedDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRememberedDeviceToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function rememberedDeviceCookieOptions(
  maxAge = REMEMBERED_DEVICE_TTL_SECONDS,
  production = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: production,
    path: SIGN_IN_COOKIE_PATH,
    maxAge,
  };
}

export async function createRememberedDevice(
  db: Database,
  studentId: string,
  now = new Date(),
  ttlSeconds = REMEMBERED_DEVICE_TTL_SECONDS,
) {
  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.isActive, true)))
    .limit(1);
  if (!student) throw new Error("An active regular student is required.");

  return createRememberedDeviceInTransaction(db, studentId, now, ttlSeconds);
}

export async function createRememberedDeviceInTransaction(
  transaction: Database | DatabaseTransaction,
  studentId: string,
  now = new Date(),
  ttlSeconds = REMEMBERED_DEVICE_TTL_SECONDS,
) {
  const token = generateRememberedDeviceToken();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const [record] = await transaction
    .insert(rememberedDevices)
    .values({
      studentId,
      tokenHash: hashRememberedDeviceToken(token),
      expiresAt,
    })
    .returning({ id: rememberedDevices.id });
  if (!record) throw new Error("Remembered device was not created.");
  return { id: record.id, token, expiresAt };
}

export async function resolveRememberedDevice(
  db: Database,
  token: string,
  now = new Date(),
) {
  const [record] = await db
    .select({
      id: rememberedDevices.id,
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      expiresAt: rememberedDevices.expiresAt,
    })
    .from(rememberedDevices)
    .innerJoin(students, eq(students.id, rememberedDevices.studentId))
    .where(
      and(
        eq(rememberedDevices.tokenHash, hashRememberedDeviceToken(token)),
        isNull(rememberedDevices.revokedAt),
        gt(rememberedDevices.expiresAt, now),
        eq(students.isActive, true),
      ),
    )
    .limit(1);
  if (!record) return null;
  await db
    .update(rememberedDevices)
    .set({ lastUsedAt: now })
    .where(
      and(
        eq(rememberedDevices.id, record.id),
        isNull(rememberedDevices.revokedAt),
        gt(rememberedDevices.expiresAt, now),
      ),
    );
  return record;
}

export async function refreshRememberedDevice(
  db: Database,
  id: string,
  now = new Date(),
  ttlSeconds = REMEMBERED_DEVICE_TTL_SECONDS,
) {
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  return db.transaction(async (transaction) => {
    const [active] = await transaction
      .select({ id: rememberedDevices.id })
      .from(rememberedDevices)
      .innerJoin(students, eq(students.id, rememberedDevices.studentId))
      .where(
        and(
          eq(rememberedDevices.id, id),
          isNull(rememberedDevices.revokedAt),
          gt(rememberedDevices.expiresAt, now),
          eq(students.isActive, true),
        ),
      )
      .limit(1);
    if (!active) return null;
    const [updated] = await transaction
      .update(rememberedDevices)
      .set({ lastUsedAt: now, expiresAt })
      .where(
        and(
          eq(rememberedDevices.id, id),
          isNull(rememberedDevices.revokedAt),
          gt(rememberedDevices.expiresAt, now),
        ),
      )
      .returning({
        id: rememberedDevices.id,
        expiresAt: rememberedDevices.expiresAt,
      });
    return updated ?? null;
  });
}

export async function revokeRememberedDevice(
  db: Database,
  token: string,
  now = new Date(),
): Promise<boolean> {
  const rows = await db
    .update(rememberedDevices)
    .set({ revokedAt: now })
    .where(
      and(
        eq(rememberedDevices.tokenHash, hashRememberedDeviceToken(token)),
        isNull(rememberedDevices.revokedAt),
      ),
    )
    .returning({ id: rememberedDevices.id });
  return rows.length > 0;
}

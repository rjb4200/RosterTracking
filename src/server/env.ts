import "server-only";

import { z } from "zod";

const databaseUrl = z.string().url().startsWith("postgresql://");

const serverEnvSchema = z.object({
  DATABASE_URL: databaseUrl,
  DATABASE_URL_DIRECT: databaseUrl,
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const runtimeDatabaseSchema = z.object({ DATABASE_URL: databaseUrl });
const authSecretSchema = z.object({ AUTH_SECRET: z.string().min(32) });

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  });

  return cachedEnv;
}

export function getRuntimeDatabaseUrl(): string {
  return runtimeDatabaseSchema.parse({ DATABASE_URL: process.env.DATABASE_URL })
    .DATABASE_URL;
}

export function getAuthSecret(): string {
  return authSecretSchema.parse({ AUTH_SECRET: process.env.AUTH_SECRET })
    .AUTH_SECRET;
}

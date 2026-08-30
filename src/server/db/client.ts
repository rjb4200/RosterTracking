import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getRuntimeDatabaseUrl } from "@/server/env";

import * as schema from "./schema";

const globalDatabase = globalThis as typeof globalThis & {
  rosterPool?: Pool;
};

function createPool(): Pool {
  const pool = new Pool({
    connectionString: getRuntimeDatabaseUrl(),
    max: 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  globalDatabase.rosterPool ??= createPool();
  return globalDatabase.rosterPool;
}

export function getDatabase() {
  return drizzle(getPool(), { schema });
}

export type Database = ReturnType<typeof getDatabase>;
export type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

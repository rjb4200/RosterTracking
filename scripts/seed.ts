import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import { seedFoundation } from "../src/server/db/seed";
import * as schema from "../src/server/db/schema";

const directUrl = z.string().url().startsWith("postgresql://").parse(process.env.DATABASE_URL_DIRECT);
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

try {
  await db.transaction(seedFoundation);

  console.log("Foundation roles and permissions seeded.");
} finally {
  await pool.end();
}

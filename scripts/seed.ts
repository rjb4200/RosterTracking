import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import { seedReferenceData } from "../src/server/db/reference-seed";
import * as schema from "../src/server/db/schema";
import { seedFoundation } from "../src/server/db/seed";

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
assertNotProtectedTarget(directUrl, "db:seed");
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

try {
  await db.transaction(async (transaction) => {
    await seedFoundation(transaction);
    await seedReferenceData(transaction);
  });

  console.log("Roles, permissions, and reference data seeded.");
} finally {
  await pool.end();
}

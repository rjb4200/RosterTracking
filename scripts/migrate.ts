import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { z } from "zod";

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
const pool = new Pool({ connectionString: directUrl, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Database migrations applied.");
} finally {
  await pool.end();
}

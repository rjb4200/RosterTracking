import "dotenv/config";
import { readFile } from "node:fs/promises";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import { importTrainingCodes } from "../src/modules/reference/services";
import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import * as schema from "../src/server/db/schema";

const inputPath = process.argv[2];
const rowSchema = z.object({
  code: z.string(),
  title: z.string(),
  sourceRevision: z.string(),
});

if (!inputPath) {
  throw new Error("Use: npm run import:training-codes -- <path-to-json-array>");
}

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
assertNotProtectedTarget(directUrl, "import:training-codes");
const actorUsername = z
  .string()
  .trim()
  .min(1)
  .parse(process.env.ADMIN_USERNAME);
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

try {
  const content = await readFile(inputPath, "utf8");
  const rows = z.array(rowSchema).parse(JSON.parse(content));
  const [actor] = await db
    .select({ id: schema.users.id, username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.username, actorUsername))
    .limit(1);

  if (!actor) {
    throw new Error(`Staff user '${actorUsername}' does not exist.`);
  }

  const count = await importTrainingCodes(db, actor, rows);
  console.log(`Imported ${count} training code rows.`);
} finally {
  await pool.end();
}

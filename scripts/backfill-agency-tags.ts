import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import { resolveLegacyAgencyTag } from "../src/modules/reference/legacy-agency-type";
import * as schema from "../src/server/db/schema";
import { agencyTagLinks, agencyTags } from "../src/server/db/schema";

// One-off: maps each agency's legacy free-text `type` to an agency tag link.
// Run between the migration that adds agency tags and the migration that drops
// `agencies.type`, and only after reference data has been seeded. Idempotent:
// agencies that already carry tags are skipped.
const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

try {
  const tags = await db
    .select({ id: agencyTags.id, code: agencyTags.code, name: agencyTags.name })
    .from(agencyTags);
  const tagByCode = new Map(tags.map((tag) => [tag.code, tag]));

  const { rows } = await pool.query<{ id: string; legacy: string | null }>(
    "select id, type as legacy from agencies where type is not null and btrim(type) <> ''",
  );

  const linkedAgencies = new Set(
    (
      await db
        .select({ agencyId: agencyTagLinks.agencyId })
        .from(agencyTagLinks)
    ).map((row) => row.agencyId),
  );

  let linked = 0;
  let fallbackToOther = 0;
  for (const row of rows) {
    if (linkedAgencies.has(row.id)) continue;
    const resolution = resolveLegacyAgencyTag(row.legacy, tags);
    if (!resolution) continue;
    const tag = tagByCode.get(resolution.code);
    if (!tag) continue;
    if (!resolution.matched) fallbackToOther += 1;
    await db
      .insert(agencyTagLinks)
      .values({ agencyId: row.id, tagId: tag.id, subtype: null })
      .onConflictDoNothing();
    linked += 1;
  }

  console.log(
    `Backfilled ${linked} agency tag link(s); ${fallbackToOther} fell back to Other.`,
  );
} finally {
  await pool.end();
}

import "dotenv/config";
import { readFile } from "node:fs/promises";

import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import { importCurriculumChapters } from "../src/modules/reference/services";
import { assertNotProtectedTarget } from "../src/server/db/maintenance-guard";
import * as schema from "../src/server/db/schema";

const inputPath = process.argv[2] ?? "scripts/data/curriculum-chapters.json";

const chapterSchema = z.object({
  part: z.string().optional().default(""),
  number: z.string().trim().min(1),
  title: z.string().trim().min(1),
});
const bookSchema = z.object({
  publisher: z.string().trim().min(1),
  programTitle: z.string().trim().min(1),
  version: z.string().trim().optional().default(""),
  sourceRevision: z.string().trim().min(1),
  chapters: z.array(chapterSchema).min(1),
});
const fileSchema = z.object({ books: z.array(bookSchema).min(1) });

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);
assertNotProtectedTarget(directUrl, "import:curriculum-chapters");
const configuredUsername = process.env.ADMIN_USERNAME?.trim();
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

try {
  const content = await readFile(inputPath, "utf8");
  const { books } = fileSchema.parse(JSON.parse(content));
  // Prefer the configured admin, but fall back to any active staff user so the
  // import can run without ADMIN_USERNAME set.
  const actorQuery = db
    .select({ id: schema.users.id, username: schema.users.username })
    .from(schema.users)
    .where(
      configuredUsername
        ? eq(schema.users.username, configuredUsername)
        : eq(schema.users.isActive, true),
    )
    .limit(1);
  const [actor] = await actorQuery;
  if (!actor) {
    throw new Error("No staff user is available to attribute the import.");
  }

  let total = 0;
  for (const book of books) {
    const versionMatch = book.version
      ? eq(schema.curricula.version, book.version)
      : isNull(schema.curricula.version);
    // Match an existing approved curriculum; add it when the reference lists a
    // book the catalog does not yet carry.
    let [curriculum] = await db
      .select({ id: schema.curricula.id })
      .from(schema.curricula)
      .where(
        and(
          eq(schema.curricula.publisher, book.publisher),
          eq(schema.curricula.programTitle, book.programTitle),
          versionMatch,
        ),
      )
      .limit(1);
    if (!curriculum) {
      [curriculum] = await db
        .insert(schema.curricula)
        .values({
          publisher: book.publisher,
          programTitle: book.programTitle,
          version: book.version || null,
          sourceRevision: book.sourceRevision,
        })
        .returning({ id: schema.curricula.id });
      console.log(`Added curriculum: ${book.publisher} — ${book.programTitle}`);
    }
    if (!curriculum) {
      throw new Error(`Could not resolve curriculum for ${book.programTitle}.`);
    }
    const rows = book.chapters.map((chapter, index) => ({
      curriculumId: curriculum.id,
      part: chapter.part,
      number: chapter.number,
      title: chapter.title,
      position: index,
      sourceRevision: book.sourceRevision,
    }));
    total += await importCurriculumChapters(db, actor, rows);
  }
  console.log(`Imported ${total} curriculum chapters.`);
} finally {
  await pool.end();
}

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import * as schema from "../src/server/db/schema";
import {
  curricula,
  curriculumChapters,
  mtuCatalogItems,
  trainingCodes,
} from "../src/server/db/schema";

/**
 * Read-only capture of the reusable data into committed sources under
 * `scripts/data/`. This command never writes to the database; it only reads. Its
 * output is deterministic (stable ordering) so the sources are reviewable in a
 * diff, and the database is treated as authoritative for the approved
 * curricula and their chapters.
 *
 * Host agencies and training sites are intentionally NOT exported; they are
 * created by hand where needed.
 *
 * See the `database-provisioning` capability.
 */

const directUrl = z
  .string()
  .url()
  .startsWith("postgresql://")
  .parse(process.env.DATABASE_URL_DIRECT);

const outputDir = join("scripts", "data");
const pool = new Pool({ connectionString: directUrl, max: 1 });
const db = drizzle(pool, { schema });

function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/** Drop null-valued keys so the source matches the import schema's shape. */
function stripNullValues(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
}

async function writeJson(fileName: string, rows: unknown): Promise<void> {
  const path = join(outputDir, fileName);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path}.`);
}

try {
  const codes = await db
    .select({
      code: trainingCodes.code,
      title: trainingCodes.title,
      sourceRevision: trainingCodes.sourceRevision,
    })
    .from(trainingCodes)
    .where(eq(trainingCodes.isActive, true))
    .orderBy(asc(trainingCodes.code), asc(trainingCodes.sourceRevision));
  await writeJson("training-codes.json", codes);
  console.log(`  training codes: ${codes.length}`);

  const curriculumRows = await db
    .select({
      id: curricula.id,
      publisher: curricula.publisher,
      programTitle: curricula.programTitle,
      version: curricula.version,
      additionalRequirements: curricula.additionalRequirements,
      sourceRevision: curricula.sourceRevision,
    })
    .from(curricula)
    .where(eq(curricula.isActive, true))
    .orderBy(
      asc(curricula.publisher),
      asc(curricula.programTitle),
      asc(curricula.sourceRevision),
    );

  await writeJson(
    "curricula.json",
    curriculumRows.map(({ id: _id, ...rest }) => ({
      ...rest,
      version: rest.version ?? "",
      additionalRequirements: rest.additionalRequirements ?? "",
    })),
  );
  console.log(`  curricula: ${curriculumRows.length}`);

  const chapterRows = await db
    .select({
      curriculumId: curriculumChapters.curriculumId,
      part: curriculumChapters.part,
      number: curriculumChapters.number,
      title: curriculumChapters.title,
      position: curriculumChapters.position,
    })
    .from(curriculumChapters)
    .where(eq(curriculumChapters.isActive, true))
    .orderBy(
      asc(curriculumChapters.curriculumId),
      asc(curriculumChapters.position),
    );

  const byCurriculum = new Map<string, typeof chapterRows>();
  for (const chapter of chapterRows) {
    const list = byCurriculum.get(chapter.curriculumId) ?? [];
    list.push(chapter);
    byCurriculum.set(chapter.curriculumId, list);
  }

  const books = curriculumRows
    .map((curriculum) => ({
      publisher: curriculum.publisher,
      programTitle: curriculum.programTitle,
      version: curriculum.version ?? "",
      sourceRevision: curriculum.sourceRevision,
      chapters: (byCurriculum.get(curriculum.id) ?? []).map((chapter) => ({
        part: chapter.part,
        number: chapter.number,
        title: chapter.title,
      })),
    }))
    .filter((book) => book.chapters.length > 0);

  await writeJson("curriculum-chapters.json", { books });
  console.log(`  chapter books: ${books.length}`);

  const mtuRows = await db
    .select({
      kind: mtuCatalogItems.kind,
      name: mtuCatalogItems.name,
      unitLabel: mtuCatalogItems.unitLabel,
      perClassQty: mtuCatalogItems.perClassQty,
      perStudentQty: mtuCatalogItems.perStudentQty,
      rounding: mtuCatalogItems.rounding,
      requiresMileage: mtuCatalogItems.requiresMileage,
      sortOrder: mtuCatalogItems.sortOrder,
      isActive: mtuCatalogItems.isActive,
    })
    .from(mtuCatalogItems)
    .orderBy(
      asc(mtuCatalogItems.kind),
      asc(mtuCatalogItems.sortOrder),
      asc(mtuCatalogItems.name),
    );
  await writeJson(
    "mtu-catalog.json",
    mtuRows.map((row) =>
      stripNullValues({
        ...row,
        perClassQty: toNumber(row.perClassQty),
        perStudentQty: toNumber(row.perStudentQty),
      }),
    ),
  );
  console.log(`  mtu catalog: ${mtuRows.length}`);

  console.log("Reference export complete (read-only).");
} finally {
  await pool.end();
}

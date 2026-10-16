import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  type Actor,
  importCurricula,
  importCurriculumChapters,
  importTrainingCodes,
  type MtuCatalogItemInput,
  reconcileMtuCatalog,
} from "@/modules/reference/services";

import type { Database } from "./client";
import { applyTrainingCategoryMappings } from "./reference-seed";
import { curricula } from "./schema";

/**
 * Reads the committed reference sources and imports them into a target
 * database. Shared by `npm run provision` and the test-database reset so both
 * build the same reusable data from the same files.
 *
 * The database is authoritative for curricula and chapters; host agencies and
 * training sites are not part of the reusable sources and are created by hand.
 */

const curriculumRowSchema = z.object({
  publisher: z.string(),
  programTitle: z.string(),
  version: z.string().optional().default(""),
  additionalRequirements: z.string().optional().default(""),
  sourceRevision: z.string(),
});
const chapterSchema = z.object({
  part: z.string().optional().default(""),
  number: z.string(),
  title: z.string(),
});
const bookSchema = z.object({
  publisher: z.string(),
  programTitle: z.string(),
  version: z.string().optional().default(""),
  sourceRevision: z.string(),
  chapters: z.array(chapterSchema).min(1),
});
const chaptersFileSchema = z.object({ books: z.array(bookSchema) });
const codeRowSchema = z.object({
  code: z.string(),
  title: z.string(),
  sourceRevision: z.string(),
});
const mtuRowSchema = z.object({
  kind: z.string(),
  name: z.string(),
  unitLabel: z.string().nullable().optional(),
  perClassQty: z.number().nullable().optional(),
  perStudentQty: z.number().nullable().optional(),
  rounding: z.string().nullable().optional(),
  requiresMileage: z.boolean().nullable().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export interface ReferenceSources {
  curricula: z.infer<typeof curriculumRowSchema>[];
  books: z.infer<typeof bookSchema>[];
  codes: z.infer<typeof codeRowSchema>[];
  mtu: MtuCatalogItemInput[];
}

async function readJson<T>(
  path: string,
  schemaValue: z.ZodType<T>,
): Promise<T> {
  const content = await readFile(path, "utf8");
  return schemaValue.parse(JSON.parse(content));
}

/**
 * The MTU catalog input schema treats absent fields as "not applicable" and
 * rejects explicit nulls, so drop null-valued keys before importing.
 */
function stripNullValues(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
}

export async function readReferenceSources(
  dataDir: string,
): Promise<ReferenceSources> {
  return {
    curricula: await readJson(
      join(dataDir, "curricula.json"),
      z.array(curriculumRowSchema),
    ),
    books: (
      await readJson(
        join(dataDir, "curriculum-chapters.json"),
        chaptersFileSchema,
      )
    ).books,
    codes: await readJson(
      join(dataDir, "training-codes.json"),
      z.array(codeRowSchema),
    ),
    mtu: (
      await readJson(join(dataDir, "mtu-catalog.json"), z.array(mtuRowSchema))
    ).map((row) => stripNullValues(row) as unknown as MtuCatalogItemInput),
  };
}

export interface ReferenceImportResult {
  curricula: number;
  chapters: number;
  codes: number;
  mtu: number;
}

export async function importReferenceData(
  db: Database,
  actor: Actor,
  sources: ReferenceSources,
): Promise<ReferenceImportResult> {
  const curriculumCount = await importCurricula(db, actor, sources.curricula);

  let chapterCount = 0;
  for (const book of sources.books) {
    const versionMatch = book.version
      ? eq(curricula.version, book.version)
      : isNull(curricula.version);
    let [curriculum] = await db
      .select({ id: curricula.id })
      .from(curricula)
      .where(
        and(
          eq(curricula.publisher, book.publisher),
          eq(curricula.programTitle, book.programTitle),
          versionMatch,
        ),
      )
      .limit(1);
    if (!curriculum) {
      [curriculum] = await db
        .insert(curricula)
        .values({
          publisher: book.publisher,
          programTitle: book.programTitle,
          version: book.version || null,
          sourceRevision: book.sourceRevision,
        })
        .returning({ id: curricula.id });
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
    chapterCount += await importCurriculumChapters(db, actor, rows);
  }

  const codeCount = await importTrainingCodes(db, actor, sources.codes);
  // The imported Fire codes arrive after the reference seed, so pair them with
  // their matching EMS categories here.
  await db.transaction(applyTrainingCategoryMappings);
  const mtuInserted = await reconcileMtuCatalog(db, actor, sources.mtu);

  return {
    curricula: curriculumCount,
    chapters: chapterCount,
    codes: codeCount,
    mtu: mtuInserted,
  };
}

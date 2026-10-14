import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import {
  getCurriculum,
  listCurriculumChaptersForAdmin,
  orderChaptersInBookOrder,
} from "@/modules/reference/services";
import { requirePagePermission } from "@/modules/staff-auth/guards";
import { PERMISSIONS } from "@/modules/staff-auth/permissions";
import { getDatabase } from "@/server/db/client";

import {
  archiveChapterAction,
  archiveCurriculumAction,
  createChapterAction,
  reactivateChapterAction,
  setCurriculumActiveAction,
  updateChapterAction,
  updateCurriculumAction,
} from "../actions";
import { ChapterForm } from "../curriculum-chapter-form";
import { CurriculumForm } from "../curriculum-form";

export const dynamic = "force-dynamic";

export default async function CurriculumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.CURRICULA_MANAGE);
  const { id } = await params;
  const db = getDatabase();
  const curriculum = await getCurriculum(db, id);
  if (!curriculum) notFound();
  const chapters = await listCurriculumChaptersForAdmin(db, id);
  const sections = [...new Set(chapters.map((c) => c.part).filter(Boolean))];
  const activeChapters = orderChaptersInBookOrder(
    chapters.filter((chapter) => !chapter.archivedAt),
  );
  const archivedChapters = orderChaptersInBookOrder(
    chapters.filter((chapter) => chapter.archivedAt),
  );

  return (
    <main className="admin-content">
      <PageHeading
        eyebrow="Reference data"
        title={curriculum.programTitle}
        meta={<p>{curriculum.publisher}</p>}
        actions={
          <>
            <Link
              href="/staff/curricula"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
            <form action={setCurriculumActiveAction}>
              <input type="hidden" name="id" value={curriculum.id} />
              <input
                type="hidden"
                name="isActive"
                value={curriculum.isActive ? "false" : "true"}
              />
              <Button
                type="submit"
                variant={curriculum.isActive ? "destructive" : "secondary"}
              >
                {curriculum.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </form>
            {!curriculum.archivedAt ? (
              <form action={archiveCurriculumAction}>
                <input type="hidden" name="id" value={curriculum.id} />
                <Button type="submit" variant="destructive">
                  Archive
                </Button>
              </form>
            ) : null}
          </>
        }
      />
      <section className="admin-section">
        <h2>Edit curriculum</h2>
        <CurriculumForm
          action={updateCurriculumAction}
          submitLabel="Save changes"
          values={{
            id: curriculum.id,
            publisher: curriculum.publisher,
            programTitle: curriculum.programTitle,
            version: curriculum.version,
            additionalRequirements: curriculum.additionalRequirements,
          }}
        />
      </section>

      <section className="admin-section">
        <h2>Chapters</h2>
        <p className="roster-note">
          Chapters are offered when staff record a Fire subject. Order is by
          section in catalog order, then the number's leading value. Archived
          chapters are hidden from this list; open "Archived chapters" to
          reactivate one.
        </p>
        <ul className="member-list">
          {activeChapters.map((chapter, index) => {
            const previous = activeChapters[index - 1];
            const showSection = !previous || previous.part !== chapter.part;
            return (
              <Fragment key={chapter.id}>
                {showSection ? (
                  <li className="member-row">
                    <strong>{chapter.part || "No section"}</strong>
                  </li>
                ) : null}
                <li className="member-row">
                  <span>
                    {chapter.number} · {chapter.title}
                  </span>
                  <div className="member-actions">
                    <details className="inline-form">
                      <summary>Edit</summary>
                      <ChapterForm
                        action={updateChapterAction}
                        curriculumId={curriculum.id}
                        submitLabel="Save chapter"
                        sections={sections}
                        values={{
                          id: chapter.id,
                          part: chapter.part,
                          number: chapter.number,
                          title: chapter.title,
                        }}
                      />
                    </details>
                    <form action={archiveChapterAction}>
                      <input
                        type="hidden"
                        name="curriculumId"
                        value={curriculum.id}
                      />
                      <input type="hidden" name="id" value={chapter.id} />
                      <Button type="submit" variant="destructive">
                        Archive
                      </Button>
                    </form>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ul>
        {archivedChapters.length ? (
          <details className="inline-form">
            <summary>Archived chapters ({archivedChapters.length})</summary>
            <ul className="member-list">
              {archivedChapters.map((chapter) => (
                <li className="member-row" key={chapter.id}>
                  <span>
                    {chapter.part ? `${chapter.part} · ` : ""}
                    {chapter.number} · {chapter.title}
                  </span>
                  <Badge variant="outline">Archived</Badge>
                  <div className="member-actions">
                    <form action={reactivateChapterAction}>
                      <input
                        type="hidden"
                        name="curriculumId"
                        value={curriculum.id}
                      />
                      <input type="hidden" name="id" value={chapter.id} />
                      <Button type="submit" variant="secondary">
                        Reactivate
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <h3>Add chapter</h3>
        <ChapterForm
          action={createChapterAction}
          curriculumId={curriculum.id}
          sections={sections}
        />
      </section>
    </main>
  );
}

import { expect, test } from "@playwright/test";
import { Pool } from "pg";

import { signIn } from "./support/auth";
import { e2eDatabaseUrl } from "./support/database";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const connectionString = e2eDatabaseUrl();
const KBEMS_DESTINATION = "KBEMS / KEMSIS";
const FIRE_DESTINATION = "Kentucky Fire Commission";
const NEW_NUMBER_LABEL = "Type a new number";

const programs = [
  { code: "emr", title: "EMR", hours: "40" },
  { code: "emt_b", title: "EMT-B", hours: "160" },
  { code: "aemt", title: "AEMT", hours: "190" },
] as const;

test("initial-certification programs show fixed hours and create a program block", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Program browser coverage runs once on chromium.",
  );
  test.skip(
    !username || !password || !connectionString,
    "Set E2E staff credentials and E2E_DATABASE_URL.",
  );
  if (!username || !password || !connectionString) return;
  test.setTimeout(180_000);

  const suffix = crypto.randomUUID();
  const pool = new Pool({ connectionString, max: 1 });
  const site = await pool.query<{ id: string }>(
    "insert into training_sites (name) values ($1) returning id",
    [`Initial Program Site ${suffix}`],
  );
  const agency = await pool.query<{ id: string }>(
    "insert into agencies (name) values ($1) returning id",
    [`Initial Program Agency ${suffix}`],
  );
  const siteId = site.rows[0]?.id;
  const agencyId = agency.rows[0]?.id;
  if (!siteId || !agencyId) {
    throw new Error("Initial-program browser fixtures were not created.");
  }

  try {
    await signIn(page, username, password);
    for (const program of programs) {
      await page.goto("/staff/classes/new");
      await page.getByLabel(KBEMS_DESTINATION).check();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      await page
        .getByLabel("Course type")
        .selectOption("initial_certification");
      await page
        .getByLabel("Initial certification program")
        .selectOption({ label: `${program.title} (${program.hours}h)` });
      await expect(page.getByLabel("EMS course name")).toHaveValue(
        program.title,
      );
      await page
        .getByRole("combobox", { name: "Course number" })
        .selectOption({ label: NEW_NUMBER_LABEL });
      await page.getByLabel("New course number").fill("126-26-77-R");
      await page
        .getByLabel("Course description or objectives")
        .fill(`${program.title} initial certification`);
      await page.getByRole("button", { name: "Next", exact: true }).click();

      await page
        .getByRole("combobox", { name: "Training site" })
        .selectOption(siteId);
      await page.getByLabel("Host agency").selectOption(agencyId);
      await page.getByLabel("Date and start time").fill("2026-09-10T09:00");
      await expect(page.getByLabel("Scheduled duration")).toHaveCount(0);
      await expect(
        page.getByText("Program hours", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();

      await expect(page.getByText("Review class")).toBeVisible();
      await expect(
        page.getByText("Initial certification program"),
      ).toBeVisible();
      await expect(
        page.getByText(`${program.title} (${program.hours}h)`),
      ).toBeVisible();
      await page.getByRole("button", { name: "Create & open" }).click();
      await expect(page.getByText("Class is open")).toBeVisible();
    }

    const created = await pool.query<{ hours: string }>(
      `select cc.credited_hours as hours
       from class_components cc
       join classes c on c.id = cc.class_id
       join initial_certification_programs p
         on p.id = c.initial_certification_program_id
       where p.code = $1
       order by c.created_at desc
       limit 1`,
      ["aemt"],
    );
    expect(created.rows[0]?.hours).toBe("190.00");
  } finally {
    await pool.end();
  }
});

test("an initial-certification program blocks a Fire combination", async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== "chromium",
    "Program browser coverage runs once on chromium.",
  );
  test.skip(!username || !password, "Set E2E staff credentials.");
  if (!username || !password) return;

  await signIn(page, username, password);
  await page.goto("/staff/classes/new");
  await page.getByLabel(FIRE_DESTINATION).check();
  await page.getByLabel(KBEMS_DESTINATION).check();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: "P0008 — Airway" });
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Course type").selectOption("initial_certification");
  await page
    .getByLabel("Initial certification program")
    .selectOption({ label: "EMR (40h)" });
  await expect(
    page.getByText("Initial-certification programs are KBEMS-only."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "KBEMS reporting" }),
  ).toBeVisible();
});

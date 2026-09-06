import { expect, test } from "@playwright/test";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const classId = process.env.E2E_OFFICIAL_ROSTER_CLASS_ID;

test("official roster downloads do not disclose artifacts without staff authorization", async ({
  request,
}) => {
  const response = await request.get(
    "/api/staff/official-rosters/00000000-0000-0000-0000-000000000000",
  );
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Not found.");
});

test("authorized staff can generate and retrieve a retained official roster", async ({
  page,
}) => {
  test.skip(
    !username || !password || !classId,
    "Set E2E staff credentials and E2E_OFFICIAL_ROSTER_CLASS_ID.",
  );
  if (!username || !password || !classId) return;
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto(`/staff/classes/${classId}`);
  const controls = page.getByLabel("Official roster generation").first();
  await expect(controls).toBeVisible();
  await expect(
    controls.getByRole("option", { name: /kfs-1a/i }),
  ).toBeAttached();
  await expect(
    controls.getByRole("option", { name: /kbems-e16/i }),
  ).toBeAttached();
  await controls.getByRole("button", { name: "Generate PDF" }).click();
  await expect(
    page.getByRole("link", { name: "Download PDF" }).first(),
  ).toBeVisible();
});

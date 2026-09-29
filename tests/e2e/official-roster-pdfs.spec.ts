import { expect, test } from "@playwright/test";
import { signIn } from "./support/auth";

const username = process.env.E2E_STAFF_USERNAME;
const password = process.env.E2E_STAFF_PASSWORD;
const classId = process.env.E2E_OFFICIAL_ROSTER_CLASS_ID;

test("official roster downloads do not disclose revisions without staff authorization", async ({
  request,
}) => {
  const response = await request.get(
    "/api/staff/official-rosters/00000000-0000-0000-0000-000000000000/kfs-1a",
  );
  expect(response.status()).toBe(404);
  expect(await response.text()).toBe("Not found.");
});

test("authorized staff can download an on-demand official roster", async ({
  page,
}) => {
  test.skip(
    !username || !password || !classId,
    "Set E2E staff credentials and E2E_OFFICIAL_ROSTER_CLASS_ID.",
  );
  if (!username || !password || !classId) return;
  await signIn(page, username, password);
  await page.goto(`/staff/classes/${classId}`);
  const controls = page.getByLabel("Official roster downloads").first();
  await expect(controls).toBeVisible();
  const kfsView = controls.getByRole("link", { name: /view kfs-1a pdf/i });
  await expect(kfsView).toHaveAttribute("target", "_blank");
  await expect(kfsView).toHaveAttribute("href", /disposition=inline/);
  await expect(
    controls.getByRole("link", { name: /view kbems-e16 pdf/i }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    controls.getByLabel(/email recipient for kfs-1a/i),
  ).toBeVisible();
  const viewHref = await kfsView.getAttribute("href");
  expect(viewHref).toBeTruthy();
  const response = await page.request.get(viewHref ?? "");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
});

import { expect, test } from "@playwright/test";

const token = process.env.E2E_CLASS_SIGN_IN_TOKEN;
const publicCode = process.env.E2E_CLASS_PUBLIC_CODE;
const accessPin = process.env.E2E_CLASS_ACCESS_PIN;

test("public class links require the configured numeric PIN", async ({
  page,
}) => {
  test.skip(
    !publicCode || !accessPin,
    "Set E2E_CLASS_PUBLIC_CODE and E2E_CLASS_ACCESS_PIN for a PIN-protected open class.",
  );
  if (!publicCode || !accessPin) return;

  await page.goto(`/${publicCode}`);
  await expect(
    page.getByRole("heading", { name: "Enter class PIN" }),
  ).toBeVisible();
  await page.getByLabel("Class PIN").fill("0000");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Class PIN").fill(accessPin);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("valid class access removes the raw token and shows mobile sign-in", async ({
  page,
}) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Class sign-in" }),
  ).toBeVisible();
  await expect(page.getByLabel("Current phone number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCSS(
    "min-height",
    "50px",
  );
});

test("unknown phone offers recovery and guest without candidate details", async ({
  page,
}) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByLabel("Current phone number").fill("859-555-0199");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("link", { name: "My phone number changed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in as a guest" }),
  ).toBeVisible();
  await expect(page.getByRole("list")).toHaveCount(0);
});

test("configured regular student reaches named profile confirmation", async ({
  page,
}) => {
  const phone = process.env.E2E_STUDENT_PHONE;
  test.skip(
    !token || !phone,
    "Set E2E_CLASS_SIGN_IN_TOKEN and E2E_STUDENT_PHONE.",
  );
  if (!token || !phone) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByLabel("Current phone number").fill(phone);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Is this you?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Not me" })).toBeVisible();
});

test("guest entry never offers remembered-device access", async ({ page }) => {
  test.skip(!token, "Set E2E_CLASS_SIGN_IN_TOKEN for an open class.");
  if (!token) return;

  await page.goto(`/sign-in/${token}`);
  await page.getByRole("link", { name: "Sign in as a guest" }).click();
  await expect(page.getByLabel("First name")).toBeVisible();
  await expect(page.getByLabel("Last name")).toBeVisible();
  await expect(page.getByLabel("Remember me on this device")).toHaveCount(0);
});

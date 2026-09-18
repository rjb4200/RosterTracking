import type { Page } from "@playwright/test";

/**
 * Signs in and waits until navigation has left the login route.
 *
 * Waiting for the session matters: clicking "Sign in" resolves before the
 * session cookie is usable, so navigating immediately races the login.
 */
export async function signIn(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(
    (url) =>
      url.pathname.startsWith("/staff/") && url.pathname !== "/staff/login",
  );
}

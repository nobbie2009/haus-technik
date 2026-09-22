import { expect, type Page, type BrowserContext } from "@playwright/test";
export async function checkSharedAccess(page: Page, context: BrowserContext) {
  const key = "fixture phrase for tests";
  await context.route("**/api/home-technik-projects**", (route) =>
    route.fulfill(
      route.request().headers().authorization === `Bearer ${key}`
        ? { json: { projects: [] } }
        : { status: 401, json: { error: "invalid" } },
    ),
  );
  const open = async (p: Page) => {
    await p.goto("/");
    await p.getByRole("button", { name: "Hausakte", exact: true }).click();
    await p.getByRole("button", { name: "Gemeinsame Projekte", exact: true }).click();
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.getByLabel("Projektdienst-Zugriffsschlüssel").fill("incorrect");
  await page.getByLabel("Auf diesem Gerät merken").check();
  await page.getByRole("button", { name: "Mit Projektdienst verbinden", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "ungültig" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("home-technik-shared-session"))).toBeNull();
  await page.getByLabel("Projektdienst-Zugriffsschlüssel").fill(key);
  await page.getByRole("button", { name: "Schlüssel anzeigen", exact: true }).click();
  await expect(page.getByLabel("Projektdienst-Zugriffsschlüssel")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Schlüssel verbergen", exact: true }).click();
  await page.getByRole("button", { name: "Mit Projektdienst verbinden", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Gespeicherten Zugang entfernen", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Projektdienst-Zugriffsschlüssel")).toHaveValue("");
  expect(await page.locator(".book-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 2)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/shared-access-phone.png" });
  const next = await context.newPage();
  await page.close();
  await open(next);
  await expect(next.getByLabel("Auf diesem Gerät merken")).toBeChecked();
  await expect(next.getByRole("button", { name: "Serverprojekte laden", exact: true })).toBeEnabled();
  await next.getByRole("button", { name: "Serverprojekte laden", exact: true }).click();
  await next.getByRole("button", { name: "Gespeicherten Zugang entfernen", exact: true }).click();
  await next.reload();
  await next.getByRole("button", { name: "Hausakte", exact: true }).click();
  await next.getByRole("button", { name: "Gemeinsame Projekte", exact: true }).click();
  await expect(next.getByRole("button", { name: "Serverprojekte laden", exact: true })).toBeDisabled();
  expect(await next.evaluate(() => localStorage.getItem("home-technik-shared-session"))).toBeNull();
  await next.close();
}

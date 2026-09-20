import { test, expect } from "@playwright/test";
test("iPad zeigt Updatehinweise auch in Split View ohne Überlauf", async ({ page }) => {
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.fulfill({ json: { tag_name: "v9.0.0" } }),
  );
  await page.goto("/");
  const button = page.getByRole("button", { name: "Version und Updates", exact: true });
  await expect(button).toContainText("Update verfügbar");
  const footer = page.getByRole("contentinfo", { name: "App-Version und Copyright" });
  for (const width of [600, 810, 1080]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(footer).toBeInViewport();
    await expect(footer).toContainText("Home-Technik · Version");
    await expect(footer).toContainText("Copyright by nobbie2009");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await button.tap();
    await expect(page.getByRole("button", { name: "Jetzt nach Updates suchen" })).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Version und Updates", exact: true });
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/ipad/update-${width}.png` });
    await page.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  }
});

test("iPad startet ein passwortgeschütztes Update per Touch", async ({ page }) => {
  let running = false;
  await page.route("**/api/home-technik-update", (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().password).toBe("test-password-123");
      running = true;
      return route.fulfill({ status: 202, json: { state: "running" } });
    }
    return route.fulfill({
      json: { supported: true, state: running ? "running" : "idle", message: "Bereit" },
    });
  });
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Version und Updates", exact: true }).tap();
  await page.getByLabel("Update-Passwort", { exact: true }).fill("test-password-123");
  await page.getByRole("button", { name: "Update installieren", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/ipad/update-install.png" });
  await page.getByRole("button", { name: "Update installieren", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Update läuft …", exact: true })).toBeDisabled();
  expect(await page.getByRole("dialog").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});

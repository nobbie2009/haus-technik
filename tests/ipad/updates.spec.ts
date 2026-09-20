import { test, expect } from "@playwright/test";
test("iPad zeigt Updatehinweise auch in Split View ohne Überlauf", async ({ page }) => {
  await page.route("https://api.github.com/repos/nobbie2009/haus-technik/releases/latest", (route) =>
    route.fulfill({ json: { tag_name: "v9.0.0" } }),
  );
  await page.goto("/");
  const button = page.getByRole("button", { name: "Version und Updates", exact: true });
  await expect(button).toContainText("Update verfügbar");
  for (const width of [600, 810, 1080]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await button.tap();
    await expect(page.getByRole("button", { name: "Jetzt nach Updates suchen" })).toBeVisible();
    const dialog = page.getByRole("dialog", { name: "Version und Updates", exact: true });
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/ipad/update-${width}.png` });
    await page.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  }
});

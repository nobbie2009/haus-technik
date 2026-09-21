import { test, expect } from "@playwright/test";
test("Handbuch auf dem iPhone: Suche, FAQ-Verweis und Inhaltsverzeichnis per Touch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/handbuch/index.html");
  await page.getByLabel("Im Handbuch suchen", { exact: true }).fill("GPS");
  await expect(page.getByRole("status")).toContainText("Fundstellen");
  await page.locator("#results a").first().tap();
  await expect(page.getByLabel("Im Handbuch suchen", { exact: true })).toHaveValue("");
  await page.locator("#navigation summary").tap();
  await page
    .getByRole("navigation", { name: "Handbuchkapitel" })
    .getByRole("link", { name: /Stichwortverzeichnis und/ })
    .tap();
  await expect(page.locator("#stichwoerter")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/handbuch/index.html");
  await page.screenshot({ path: "test-results/ipad/handbook-phone.png" });
});

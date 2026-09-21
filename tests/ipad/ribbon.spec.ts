import { test, expect } from "@playwright/test";

test("Menüband per Touch auf iPhone sowie iPad im Hoch- und Querformat", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 810, height: 1080 },
    { width: 1080, height: 810 },
  ]) {
    await page.setViewportSize(viewport);
    const toggle = page.getByRole("button", { name: "Werkzeuge", exact: true });
    const surface = page.getByTestId("drawing-surface");
    const closed = (await surface.boundingBox())!;
    expect(closed.height).toBeGreaterThan(300);
    for (const name of [
      "Haus / Raum",
      "Möbel",
      "Grundstück",
      "Netzwerk",
      "Elektrik",
      "Wasser / Wärme / Gas",
    ]) {
      await page.getByRole("tab", { name, exact: true }).tap();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const tabs = page.getByRole("tabpanel", { name, exact: true });
      await expect(tabs).toBeVisible();
      await toggle.tap();
      await expect(tabs).not.toBeVisible();
      expect((await surface.boundingBox())!.height).toBe(closed.height);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/ribbon-touch-${viewport.width}.png` });
  }
});

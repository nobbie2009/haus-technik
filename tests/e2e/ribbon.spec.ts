import { test, expect } from "@playwright/test";

test("Menüband liegt über dem Plan und bedient Tabs, Geschosse und Ebenen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const ribbon = page.getByRole("complementary", { name: "Werkzeuge und Ebenen" });
  const surface = page.getByTestId("drawing-surface");
  const top = (await ribbon.boundingBox())!,
    plan = (await surface.boundingBox())!;
  expect(top.y + top.height).toBeLessThanOrEqual(plan.y + 1);
  expect(plan.x).toBe(0);
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true })).toBeFocused();
  await expect(page.getByLabel("Leitungsmedium", { exact: true })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Haus / Raum", exact: true })).toBeFocused();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(ribbon.getByRole("region", { name: "Geschosse verwalten", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Etage erstellen", exact: true }).click();
  const floor = page.getByRole("region", { name: "Etage erstellen", exact: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await floor.getByLabel("Name", { exact: true }).fill("Garten");
  await floor.getByRole("button", { name: "Etage erstellen", exact: true }).click();
  await expect(page.getByTitle("Geschosse verwalten", { exact: true })).toContainText("Garten");
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  const layers = page.getByRole("region", { name: "Ebenen", exact: true });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(ribbon.getByRole("region", { name: "Ebenen", exact: true })).toBeVisible();
  const section = (await layers.boundingBox())!;
  expect(section.y + section.height).toBeLessThanOrEqual((await surface.boundingBox())!.y + 1);
  await page.screenshot({ path: "test-results/ribbon-inline-desktop.png" });
  await layers.getByRole("button", { name: "Grundriss sperren", exact: true }).click();
  await expect(layers.getByRole("button", { name: "Grundriss entsperren", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Ebenen", exact: true })).toBeFocused();
  await page.screenshot({ path: "test-results/ribbon-desktop.png" });
});

test("Schmales Menüband bleibt einklappbar und alle Tabs erreichbar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Werkzeuge", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const before = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByLabel("Leitungsmedium", { exact: true })).toBeVisible();
  await toggle.click();
  await expect(page.getByLabel("Leitungsmedium", { exact: true })).not.toBeVisible();
  expect((await page.getByTestId("drawing-surface").boundingBox())!.height).toBe(before.height);
  await toggle.click();
  await page.locator("#tools-panel").evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).click();
  expect(await page.locator("#tools-panel").evaluate((el) => el.scrollLeft)).toBe(0);
  await toggle.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await expect(page.locator("#properties-panel")).toBeVisible();
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await page.screenshot({ path: "test-results/ribbon-phone.png" });
});

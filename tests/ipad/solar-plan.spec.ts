import { test, expect } from "@playwright/test";

test("Solaranlage per Touch platzieren und die Solarakte öffnen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).tap();
  await page.getByLabel("Solarobjekt platzieren", { exact: true }).selectOption("plant");
  await page.getByRole("button", { name: "Menüband", exact: true }).tap();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.touchscreen.tap(box.x + 300, box.y + 250);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Balkonkraftwerk", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Zugehörige Solarakte öffnen", exact: true }).tap();
  const dialog = page.getByRole("dialog", { name: "Hausakte", exact: true });
  await dialog.getByRole("button", { name: "Im Plan platzieren: Wechselrichter", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await page.touchscreen.tap(box.x + 550, box.y + 250);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await expect(page.getByLabel("AC-Nennleistung (W)", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/solar-plan-ipad.png" });
});

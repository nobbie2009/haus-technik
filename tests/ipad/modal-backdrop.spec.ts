import { test, expect } from "@playwright/test";

test("Popup unterscheidet Textauswahl und Antippen des Hintergrunds in WebKit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Neu", exact: true }).tap();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("textbox").first();
  await input.fill("Text zum Markieren");
  const field = (await input.boundingBox())!;
  const box = (await dialog.boundingBox())!;
  await page.mouse.move(field.x + 80, field.y + field.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 20, field.y + field.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("Text zum Markieren");
  await page.touchscreen.tap(box.x - 20, field.y + field.height / 2);
  await expect(dialog).not.toBeVisible();
});

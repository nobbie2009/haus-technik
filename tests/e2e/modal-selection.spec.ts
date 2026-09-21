import { test, expect } from "@playwright/test";

test("Textauswahl über den Dialogrand schließt das Popup nicht", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("textbox").first();
  await input.fill("Ein längerer Projektname zum Markieren");
  const field = (await input.boundingBox())!;
  const box = (await dialog.boundingBox())!;
  await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 30, field.y + field.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("Ein längerer Projektname zum Markieren");
  expect(
    await input.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!),
  ).toBeGreaterThan(0);

  // Ein Zug in die Gegenrichtung darf ebenfalls nicht als Hintergrundklick gelten.
  await page.mouse.move(box.x - 30, field.y + field.height / 2);
  await page.mouse.down();
  await page.mouse.move(field.x + 20, field.y + field.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();

  // Ein absichtlicher Klick auf den Hintergrund schließt weiterhin.
  await page.mouse.click(box.x - 30, field.y + field.height / 2);
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Neu", exact: true }).click();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

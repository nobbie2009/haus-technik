import { test, expect } from "@playwright/test";
import { wallProject, wallPng } from "../wallPhotoFixture";
test("Touch: Foto-Bezugspunkt erfassen und Baustellennotiz auf iPhone-Breite speichern", async ({ page }) => {
  test.setTimeout(45_000);
  const { project } = wallProject();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "wand.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await page.locator(".object-list summary").tap();
  await page.getByRole("button", { name: /^Wand 1/ }).tap();
  await page.getByRole("button", { name: "Wandfotos und Verläufe (0)" }).tap();
  const dialog = page.getByRole("dialog", { name: "Wandfotos und Leitungsverläufe", exact: true });
  await dialog
    .getByLabel("Wandfoto hinzufügen")
    .setInputFiles({ name: "wand.png", mimeType: "image/png", buffer: await wallPng(page) });
  await dialog.getByRole("button", { name: "Bezugspunkt setzen", exact: true }).tap();
  const canvas = page.getByTestId("wall-photo-canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.tap({ position: { x: box.width * 0.2, y: box.height * 0.4 } });
  await dialog.getByLabel("Bezugspunktname", { exact: true }).fill("Fensterkante");
  await dialog.getByRole("button", { name: "Bezugspunkt speichern", exact: true }).tap();
  await expect(dialog.getByRole("button", { name: "Bezugspunkt löschen: Fensterkante" })).toBeVisible();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Baustelle", exact: true }).tap();
  const notes = page.getByRole("dialog", { name: "Baustellenansicht", exact: true });
  await notes.getByLabel("Baustellentitel", { exact: true }).fill("Fensteranschluss prüfen");
  await notes.getByLabel("Messwert mit Einheit und Bezug").fill("30 cm ab linker Kante");
  await notes.getByRole("button", { name: "Baustellennotiz speichern", exact: true }).tap();
  await expect(notes.getByRole("heading", { name: "Fensteranschluss prüfen" })).toBeVisible();
  expect(await notes.evaluate((el) => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
  await page.screenshot({ path: "test-results/ipad/construction-phone.png" });
  await notes.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Gemeinsame Projekte", exact: true }).tap();
  await expect(page.getByLabel("Projektdienst-Zugriffsschlüssel")).toBeVisible();
  expect(await page.locator(".book-content").evaluate((el) => el.scrollWidth <= el.clientWidth + 2)).toBe(
    true,
  );
});

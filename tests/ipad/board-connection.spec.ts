import { test, expect } from "@playwright/test";
import { distributionFixture } from "../electrical/distributionFixture";
test("Touch: Sicherung als Leitungsabgang wählen", async ({ page }) => {
  const { project, main, outlet, feeder } = distributionFixture();
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).tap();
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await page.locator(".object-list summary").tap();
  await page
    .locator(".object-list")
    .getByRole("button", { name: project.electrical.distributionBoards[main]!.name, exact: true })
    .tap();
  await page.getByRole("button", { name: "Sicherungskasten öffnen", exact: true }).tap();
  await page.getByRole("button", { name: "Leitung verbinden", exact: true }).tap();
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(outlet);
  await page.getByLabel("Start · Sicherung / Stromkreis", { exact: true }).selectOption(`circuit:${feeder}`);
  await expect(page.getByLabel("Verfügbare Startkontakte")).not.toContainText("IN_");
  await page.getByRole("button", { name: "Kontaktverbindung ergänzen", exact: true }).tap();
  await page.getByLabel("Verbindung 1 · Startkontakt", { exact: true }).selectOption(`${feeder}:L1`);
  await page.getByLabel("Verbindung 1 · Zielkontakt", { exact: true }).selectOption("L");
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole("dialog", { name: "Anschlüsse verbinden", exact: true });
  expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBeTruthy();
  await page.getByRole("button", { name: "Belegung speichern", exact: true }).tap();
  await expect(page.getByRole("dialog", { name: /^Sicherungskasten ·/ })).toBeVisible();
});

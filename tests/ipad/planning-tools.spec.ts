import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
test("iPad: Technik verfolgen, Umbauvergleich, QR und benannte Sicherung bedienen", async ({ page }) => {
  const { project, devices } = simulationFixture();
  await page.goto("/");
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Verbindungen & Abschalten", exact: true }).tap();
  await page.getByLabel("Ausgangspunkt", { exact: true }).selectOption(devices[0]!);
  await page.getByRole("button", { name: "Im Plan hervorheben", exact: true }).tap();
  await page.getByRole("button", { name: "Hervorhebung beenden", exact: true }).tap();
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await nav.getByRole("button", { name: "Bestand / Umbau", exact: true }).tap();
  await expect(page.getByRole("img", { name: "Umbauplan", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "QR-Aufkleber", exact: true }).tap();
  await page.getByLabel("Akten für QR filtern", { exact: true }).fill("Fernseher");
  await page.getByRole("checkbox", { name: /^Fernseher/ }).check();
  await expect(page.getByRole("img", { name: "QR-Code für Fernseher", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Wiederherstellung", exact: true }).tap();
  await page.getByLabel("Name des Versionsstands", { exact: true }).fill("iPad-Sicherung");
  await page.getByRole("button", { name: "Versionsstand sichern", exact: true }).tap();
  await expect(page.getByText("Versionsstand gespeichert.", { exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Wartungen", exact: true }).tap();
  await page.getByLabel("Kalendermonat", { exact: true }).fill("2026-10");
  await page.getByRole("button", { name: "2026-10-01: 0 Termine", exact: true }).tap();
  await page.screenshot({ path: "test-results/planning-tools-ipad.png" });
});

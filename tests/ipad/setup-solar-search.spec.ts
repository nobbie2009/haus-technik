import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
test("iPad: Assistent fortsetzen, Solarakte erfassen und über Suche öffnen", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "einrichtung.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createProject())),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Mit Einrichtung beginnen", exact: true }).tap();
  await page.getByRole("button", { name: "Für später überspringen", exact: true }).tap();
  await page.getByRole("button", { name: "Pausieren und schließen", exact: true }).tap();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Einrichtung fortsetzen", exact: true }).tap();
  await expect(page.getByText("Schritt 2 von 6", { exact: false })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Balkonkraftwerk", exact: true }).tap();
  await page.getByLabel("Anlagenname", { exact: true }).fill("Garten Solar");
  await page.getByLabel("Wechselrichter: Seriennummer", { exact: true }).fill("IPAD-123");
  await page.getByRole("button", { name: "Modulgruppe hinzufügen", exact: true }).tap();
  await page.getByLabel("Modulgruppe 1: Wp je Modul", { exact: true }).fill("430");
  await page.getByRole("button", { name: "Solaranlage speichern", exact: true }).tap();
  await expect(page.getByText("Anlage gespeichert.", { exact: true })).toBeVisible();
  for (const size of [
    { width: 810, height: 1080 },
    { width: 1080, height: 810 },
  ]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator(".book-content").evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
      true,
    );
  }
  await nav.getByRole("button", { name: "Suche", exact: true }).tap();
  await page.getByLabel("Haus durchsuchen", { exact: true }).fill("IPAD-123");
  await expect(page.getByText("1 Treffer", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/ipad/setup-search.png" });
  await page.getByRole("button", { name: "Öffnen: Garten Solar", exact: true }).tap();
  await expect(page.getByLabel("Wechselrichter: Seriennummer", { exact: true })).toHaveValue("IPAD-123");
  await page.getByRole("button", { name: "Speichern und Ertragszähler öffnen", exact: true }).tap();
  await expect(page.getByLabel("Zähler auswählen", { exact: true })).toContainText("Garten Solar · Ertrag");
});

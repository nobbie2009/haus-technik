import { test, expect, type Page } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { setup } from "../../src/housebook/setup";
import { solarPlants } from "../../src/housebook/solar";
import { homeBook } from "../../src/housebook/home";
async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "neu.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createProject())),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
}
async function exported(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Einrichtung pausieren, raumweise fortsetzen und ohne Duplikate abschließen", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Mit Einrichtung beginnen", exact: true }).click();
  await page.getByLabel("Hausname", { exact: true }).fill("Unser Zuhause");
  await page.getByRole("button", { name: "Hausname speichern", exact: true }).click();
  await page.getByText("Rechteckigen Raum mit bekannten Maßen ergänzen", { exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByLabel("Raumname", { exact: true }).fill("Flur");
    await page.getByLabel("Raumbreite (m)", { exact: true }).fill("3");
    await page.getByLabel("Raumtiefe (m)", { exact: true }).fill("4");
    await page.getByRole("button", { name: "Raum übernehmen", exact: true }).click();
  }
  await expect(
    page.getByText("Vorhandener Raum ausgewählt – kein Duplikat angelegt.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schritt bestätigen und weiter", exact: true }).click();
  await page.getByRole("button", { name: "Für später überspringen", exact: true }).click();
  await page.getByLabel("Balkonkraftwerk", { exact: true }).check();
  await page.getByLabel("Internet & WLAN", { exact: true }).check();
  await page.getByRole("button", { name: "Pausieren und schließen", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Einrichtung fortsetzen", exact: true }).click();
  await expect(page.getByText("Schritt 3 von 6", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Balkonkraftwerk", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Schritt bestätigen und weiter", exact: true }).click();
  await page.getByLabel("Diesen Raum durchgesehen", { exact: true }).check();
  await page.getByRole("button", { name: "Rauchmelder erfassen", exact: true }).click();
  await expect(page.getByLabel("Standort", { exact: true })).toHaveValue("Flur");
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Flurmelder");
  await page.getByLabel("Seriennummer", { exact: true }).fill("RM-42");
  await page.getByRole("button", { name: "Eintrag speichern", exact: true }).click();
  await page.getByRole("button", { name: "Zur Einrichtung zurück", exact: true }).click();
  await expect(page.getByLabel("Diesen Raum durchgesehen", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Schritt bestätigen und weiter", exact: true }).click();
  await expect(page.getByRole("button", { name: /Balkonkraftwerk erfassen/ })).toBeVisible();
  await page.getByRole("button", { name: "Für später überspringen", exact: true }).click();
  await page.getByRole("button", { name: "Ersten Rundgang abschließen", exact: true }).click();
  await expect(page.getByText("Erster Rundgang abgeschlossen", { exact: false })).toBeVisible();
  await page.screenshot({ path: "test-results/setup-summary.png" });
  await page.getByRole("button", { name: "Pausieren und schließen", exact: true }).click();
  const p = await exported(page);
  expect(Object.keys(p.rooms)).toHaveLength(1);
  expect(setup(p)).toMatchObject({ step: 5, finished: true, skipped: [1, 4] });
  expect(setup(p).reviewedRooms).toHaveLength(1);
  expect(homeBook(p).items[0]!.asset.serial).toBe("RM-42");
});
test("Solarakte mit Modulen, Speicher, Ertragszähler und Suche", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Balkonkraftwerk", exact: true }).click();
  await page.getByLabel("Anlagenname", { exact: true }).fill("Balkon Süd");
  await page.getByLabel("Anlagenstandort", { exact: true }).fill("Obergeschoss");
  await page.getByRole("button", { name: "Modulgruppe hinzufügen", exact: true }).click();
  await page.getByLabel("Modulgruppe 1: Anzahl", { exact: true }).fill("2");
  await page.getByLabel("Modulgruppe 1: Wp je Modul", { exact: true }).fill("440");
  await page.getByLabel("Wechselrichter: Seriennummer", { exact: true }).fill("INV-2026");
  await page.getByLabel("Wechselrichter: AC-Nennleistung (W)", { exact: true }).fill("800");
  await page.getByLabel("Speicher vorhanden", { exact: true }).check();
  await page.getByLabel("Speicherkapazität (Wh)", { exact: true }).fill("2000");
  await expect(page.getByText("880 Wp", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Speichern und Ertragszähler öffnen", exact: true }).click();
  await expect(page.getByLabel("Zähler auswählen", { exact: true })).toContainText("Balkon Süd · Ertrag");
  for (const [date, value] of [
    ["2026-01-01", "100"],
    ["2026-02-01", "160"],
  ]) {
    await page.getByLabel("Ablesedatum", { exact: true }).fill(date!);
    await page.getByLabel("Zählerstand (kWh)", { exact: true }).fill(value!);
    await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  }
  await nav.getByRole("button", { name: "Suche", exact: true }).click();
  await page.getByLabel("Haus durchsuchen", { exact: true }).fill("inv-2026 obergeschoss");
  await expect(page.getByText("1 Treffer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Öffnen: Balkon Süd", exact: true }).click();
  await expect(page.getByLabel("Wechselrichter: Seriennummer", { exact: true })).toHaveValue("INV-2026");
  await expect(page.getByText(/Erfasster Ertrag: 60 kWh/)).toBeVisible();
  await page.screenshot({ path: "test-results/solar-plant.png" });
  await page.getByRole("button", { name: "Speichern und Ertragszähler öffnen", exact: true }).click();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const p = await exported(page);
  expect(solarPlants(p)).toHaveLength(1);
  expect(solarPlants(p)[0]!.battery?.capacityWh).toBe(2000);
  expect(homeBook(p).meters).toHaveLength(1);
  expect(homeBook(p).meters[0]!.readings).toHaveLength(2);
  expect(Object.keys(p.electrical.supplies)).toHaveLength(0);
  expect(errors).toEqual([]);
});

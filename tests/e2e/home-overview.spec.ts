import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { homeBook } from "../../src/housebook/home";
import { housebook } from "../../src/housebook/model";
test("Hausübersicht: WLAN, Hausobjekte, Verbrauch und Wartung bleiben gespeichert", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "home.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createProject())),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Bereiche der Hausakte" });
  await nav.getByRole("button", { name: "Internet & WLAN", exact: true }).click();
  await page.getByLabel("Anbieter", { exact: true }).fill("Mein Anbieter");
  await page.getByRole("button", { name: "Internetanschluss speichern", exact: true }).click();
  await page.getByLabel("Netzwerkname").fill("Router Flur");
  await page.getByLabel("Geräteart", { exact: true }).selectOption("router");
  await page.getByRole("button", { name: "Netzwerkgerät hinzufügen", exact: true }).click();
  await page.getByLabel("Gerät für WLAN-Angaben").selectOption({ label: "Router Flur" });
  await page.getByLabel("WLAN-Name (SSID)").fill("Zuhause");
  await page.getByRole("button", { name: "WLAN-Angaben speichern", exact: true }).click();
  await nav.getByRole("button", { name: "Rauchmelder", exact: true }).click();
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Melder Flur");
  await page.getByLabel("Standort", { exact: true }).fill("OG Flur");
  await page.getByLabel("Nächste Prüfung", { exact: true }).fill("2027-01-01");
  await page.getByRole("button", { name: "Letzte Planposition übernehmen", exact: true }).click();
  await page.getByRole("button", { name: "Eintrag speichern", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bearbeiten: Melder Flur", exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Absperrstellen", exact: true }).click();
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Hauptwasser");
  await page.getByLabel("Sperrt / versorgt").fill("Gesamtes Haus");
  await page.getByRole("button", { name: "Eintrag speichern", exact: true }).click();
  await nav.getByRole("button", { name: "Garten & Außenlicht", exact: true }).click();
  await page.getByLabel("Objektart", { exact: true }).selectOption("outdoorLight");
  await page.getByLabel("Bezeichnung", { exact: true }).fill("Terrassenlicht");
  await page.getByLabel("Leistung (W)", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Letzte Planposition übernehmen", exact: true }).click();
  await page.getByRole("button", { name: "Als elektrischen Verbraucher anlegen", exact: true }).click();
  await nav.getByRole("button", { name: "Zähler & Verbrauch", exact: true }).click();
  await page.getByLabel("Zählername", { exact: true }).fill("Hausstrom");
  await page.getByLabel("Rechenpreis (€ je Einheit)").fill("0.3");
  await page.getByRole("button", { name: "Zähler speichern", exact: true }).click();
  for (const [date, value] of [
    ["2026-01-01", "100"],
    ["2026-02-01", "410"],
  ]) {
    await page.getByLabel("Ablesedatum", { exact: true }).fill(date!);
    await page.getByLabel("Zählerstand (kWh)", { exact: true }).fill(value!);
    await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  }
  await expect(page.locator(".home-summary")).toContainText("310 kWh");
  await expect(page.locator(".home-summary")).toContainText("93 €");
  await page.getByLabel("Ablesedatum", { exact: true }).fill("2026-03-01");
  await page.getByLabel("Zählerstand (kWh)", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Hausakte", exact: true }).getByRole("alert")).toContainText(
    "Sinkender Zählerstand",
  );
  await page.getByLabel("Zählerwechsel / Neustart seit letzter Ablesung").check();
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  await expect(page.getByText("Unbekannt (Zählerwechsel)", { exact: true })).toBeVisible();
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Verbrauch als CSV", exact: true }).click();
  const csvFile = await csvEvent;
  expect(csvFile.suggestedFilename()).toBe("Hausstrom-Verbrauch.csv");
  const csvChunks: Buffer[] = [];
  for await (const chunk of await csvFile.createReadStream()) csvChunks.push(Buffer.from(chunk));
  expect(Buffer.concat(csvChunks).toString()).toContain("310");
  expect(Buffer.concat(csvChunks).toString()).toContain("unbekannt");
  await page.screenshot({ path: "test-results/home-consumption.png" });
  await nav.getByRole("button", { name: "Wartungen", exact: true }).click();
  await expect(page.getByText("2027-01-01 · Melder Flur · Prüfung", { exact: true })).toBeVisible();
  await page.getByLabel("Wartungsname", { exact: true }).fill("Filter reinigen");
  await page.getByLabel("Fällig am", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Wiederholung (Monate, 0 = einmalig)").fill("1");
  await page.getByRole("button", { name: "Wartung speichern", exact: true }).click();
  await page.getByRole("button", { name: "Erledigen: Filter reinigen", exact: true }).click();
  await page.getByLabel("Erledigt am", { exact: true }).fill("2026-01-31");
  await page.getByRole("button", { name: "Erledigung speichern", exact: true }).click();
  await expect(page.getByText("2026-02-28 · Filter reinigen", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "JSON exportieren", exact: true })).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await download).createReadStream()) chunks.push(Buffer.from(chunk));
  const p = JSON.parse(Buffer.concat(chunks).toString()),
    b = homeBook(p);
  expect(b.items).toHaveLength(3);
  expect(b.meters[0]!.readings).toHaveLength(3);
  expect(b.tasks[0]!.history).toHaveLength(1);
  expect(b.internet.provider).toBe("Mein Anbieter");
  expect(housebook(p).networkNodes[0]!.details?.ssid).toBe("Zuhause");
  expect(Object.values(p.electrical.devices)).toHaveLength(1);
  expect(errors).toEqual([]);
});

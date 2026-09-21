import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
import { assetSchema, setAsset } from "../../src/housebook/model";
import { homeBook, setHomeBook } from "../../src/housebook/home";
import { newId } from "../../src/utils/uuid";
test("Versorgung verfolgen, Abschalten prüfen, Umbau vergleichen und Geräte-QR öffnen", async ({ page }) => {
  const { project, devices, terminal } = simulationFixture();
  setAsset(project.electrical.devices[devices[0]!]!, assetSchema.parse({ status: "planned" }));
  await page.goto("/");
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Verbindungen & Abschalten", exact: true }).click();
  await page.getByLabel("Ausgangspunkt", { exact: true }).selectOption(devices[0]!);
  await expect(page.getByText("Versorgungsweg anhand", { exact: false })).toBeVisible();
  await page.getByLabel("Ausgangspunkt", { exact: true }).selectOption(terminal);
  await page.getByLabel("Analyse", { exact: true }).selectOption("shutdown");
  for (const name of ["Fernseher", "PC", "Lampe", "Kaffeemaschine"])
    await expect(page.getByRole("button", { name: `Zum Objekt: ${name}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Zum Objekt: Fernseher", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hervorhebung beenden", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/connection-highlight.png" });
  await page.getByRole("button", { name: "QR-Code für dieses Objekt", exact: true }).click();
  await expect(page.getByRole("img", { name: "QR-Code für Fernseher", exact: true })).toBeVisible();
  await expect(page.getByText("1 Aufkleber ausgewählt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bestand / Umbau", exact: true }).click();
  await expect(page.getByRole("img", { name: "Bestandsplan", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Umbauplan", exact: true })).toBeVisible();
  expect(await page.getByRole("img", { name: "Bestandsplan", exact: true }).getAttribute("src")).not.toEqual(
    await page.getByRole("img", { name: "Umbauplan", exact: true }).getAttribute("src"),
  );
  await page.screenshot({ path: "test-results/renovation-comparison.png" });
});
test("Benannte Stände sichern und wiederherstellen, Wartungskalender und Prüfbericht exportieren", async ({
  page,
}) => {
  const { project } = simulationFixture(),
    b = homeBook(project);
  b.tasks.push({
    id: newId(),
    title: "Filterwechsel",
    location: "Keller",
    target: null,
    itemId: null,
    notes: "",
    due: "2026-10-01",
    intervalMonths: 6,
    history: [],
  });
  setHomeBook(project, b);
  await page.goto("/");
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Wiederherstellung", exact: true }).click();
  await page.getByLabel("Name des Versionsstands", { exact: true }).fill("Vor Gartenumbau");
  await page.getByRole("button", { name: "Versionsstand sichern", exact: true }).click();
  await expect(page.getByText("Versionsstand gespeichert.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mit aktuellem Stand vergleichen: Vor Gartenumbau", exact: true })
    .click();
  await expect(page.getByText("Keine inhaltlichen Änderungen.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wartungen", exact: true }).click();
  await page.getByLabel("Kalendermonat", { exact: true }).fill("2026-10");
  await page.getByRole("button", { name: "2026-10-01: 1 Termine", exact: true }).click();
  let event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Termine als Kalenderdatei exportieren", exact: true }).click();
  expect((await event).suggestedFilename()).toBe("Haus-Wartungen.ics");
  await page.screenshot({ path: "test-results/maintenance-calendar.png" });
  await page.getByRole("button", { name: /^Projektprüfung/ }).click();
  event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Prüfbericht als CSV", exact: true }).click();
  expect((await event).suggestedFilename()).toBe("Planpruefung.csv");
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Wiederherstellung", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: "Vor Gartenumbau" });
  await row.getByRole("button", { name: "Wiederherstellen …", exact: true }).click();
  await row.getByRole("button", { name: "Diesen Stand jetzt übernehmen", exact: true }).click();
  await expect(page.getByText("Projektstand wiederhergestellt.", { exact: true })).toBeVisible();
});

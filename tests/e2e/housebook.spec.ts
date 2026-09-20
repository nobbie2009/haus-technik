import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createDemoProject } from "../../src/editor/demoProject";
import { simulationFixture } from "../simulation/fixture";
import { housebook, asset } from "../../src/housebook/model";
import type { Project } from "../../src/models/project";

async function load(page: Page, project = createDemoProject()) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Hausakte", exact: true })).toBeVisible();
}
async function exported(page: Page): Promise<Project> {
  const result = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await result).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Hausakte: echte SVG-/PDF-Ausgabe und Layout bei 1024 px", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  await page.screenshot({ path: "test-results/housebook-overview.png" });
  await page.getByRole("button", { name: "Ausgabe", exact: true }).click();
  let event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grundriss als SVG", exact: true }).click();
  await (await event).saveAs("test-results/housebook-plan.svg");
  event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grundriss als PDF", exact: true }).click();
  const pdf = await event;
  expect(pdf.suggestedFilename()).toBe("Hausplan.pdf");
  await pdf.saveAs("test-results/housebook-plan.pdf");
  event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Verteiler- und Material-PDF", exact: true }).click();
  await (await event).saveAs("test-results/housebook-inventory.pdf");
  await page.setViewportSize({ width: 1024, height: 768 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/housebook-1024.png" });
  expect(errors).toEqual([]);
});
test("Vorlage skalieren, speichern und nach Neuladen erhalten", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Grundrissvorlage", exact: true }).click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 500;
    const x = c.getContext("2d")!;
    x.fillStyle = "white";
    x.fillRect(0, 0, 800, 500);
    x.strokeRect(100, 100, 600, 300);
    return c.toDataURL("image/png").split(",")[1]!;
  });
  await page
    .getByLabel("Vorlage importieren", { exact: true })
    .setInputFiles({ name: "Grundriss.png", mimeType: "image/png", buffer: Buffer.from(image, "base64") });
  await expect(page.getByRole("button", { name: "Vorlage speichern", exact: true })).toBeVisible();
  const preview = page.getByRole("button", { name: "Kalibrierpunkt auf Vorlage setzen" });
  await preview.click({ position: { x: 100, y: 100 } });
  await preview.click({ position: { x: 300, y: 100 } });
  await page.getByLabel("Bekannte Strecke (mm)").fill("4000");
  await page.getByRole("button", { name: "Maßstab aus zwei Punkten setzen" }).click();
  await page.getByRole("button", { name: "Vorlage speichern", exact: true }).click();
  await expect(page.getByText("Vorlage gespeichert.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const before = await exported(page);
  expect(housebook(before).backgrounds[before.floorOrder[0]!]!.width).toBeGreaterThan(4000);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(housebook(await exported(page))).toEqual(housebook(before));
});
test("Szenariovergleich, Objektakte und Versorgungsschema", async ({ page }) => {
  const { project, devices } = simulationFixture();
  await load(page, project);
  await page.getByRole("button", { name: "Szenarien", exact: true }).click();
  await page.getByLabel("Szenarioname").fill("Abendbetrieb");
  await page.getByRole("button", { name: "Aktuellen Zustand speichern" }).click();
  await expect(page.getByRole("cell", { name: "2255 W" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "61.3 %" })).toBeVisible();
  await page.getByRole("button", { name: "Ausgabe", exact: true }).click();
  const inventory = page.waitForEvent("download");
  await page.getByRole("button", { name: "Verteiler- und Material-PDF", exact: true }).click();
  await (await inventory).saveAs("test-results/housebook-populated-inventory.pdf");
  await page.getByRole("button", { name: "Objektakten", exact: true }).click();
  await page.getByLabel("Objekte suchen").fill("Fernseher");
  await page.getByRole("button", { name: "Akte öffnen", exact: true }).click();
  await page.getByLabel("Modell", { exact: true }).fill("TV 2026");
  await page.getByLabel("Umbauzustand", { exact: true }).selectOption("planned");
  await page.getByLabel("Notizen und Wartungshinweise").fill("An Wand montieren.");
  await page.getByRole("button", { name: "Objektakte speichern" }).click();
  await page.getByRole("button", { name: "Versorgungsschema", exact: true }).click();
  await page.screenshot({ path: "test-results/housebook-schematic.png" });
  await page.getByRole("button", { name: /Im Plan:.*Fernseher/ }).click();
  await expect(page.getByRole("dialog", { name: "Hausakte", exact: true })).not.toBeVisible();
  const p = await exported(page);
  expect(asset(p.electrical.devices[devices[0]!]!).model).toBe("TV 2026");
  expect(housebook(p).scenarios[0]!.name).toBe("Abendbetrieb");
});
test("Netzwerk anlegen, Ports prüfen und Raumvorlage einfügen", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Internet & WLAN", exact: true }).click();
  await page.getByLabel("Netzwerkname").fill("Dose Büro");
  await page.getByRole("button", { name: "Netzwerkgerät hinzufügen" }).click();
  await page.getByLabel("Netzwerkname").fill("Patchpanel");
  await page.getByRole("button", { name: "Netzwerkgerät hinzufügen" }).click();
  await page.getByLabel("Von Gerät").selectOption({ label: "Dose Büro" });
  await page.getByLabel("Zu Gerät").selectOption({ label: "Patchpanel" });
  await page.getByRole("button", { name: "Ports verbinden", exact: true }).click();
  await expect(page.getByText(/NET-01: Dose Büro:1/)).toBeVisible();
  await page.getByRole("button", { name: "Ports verbinden", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("mehrfach belegt");
  await page.getByRole("button", { name: "Raumvorlagen", exact: true }).click();
  await page.getByLabel("Vorlagenname").fill("Wohnraum");
  await page.getByRole("button", { name: "Raumvorlage speichern", exact: true }).click();
  await page.getByRole("button", { name: "Auf aktueller Etage einfügen", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Hausakte", exact: true })).not.toBeVisible();
  expect(Object.keys((await exported(page)).rooms)).toHaveLength(5);
});
test("Home Assistant liest nur Zustände und speichert keinen Token", async ({ page }) => {
  const { project, devices } = simulationFixture();
  project.electrical.devices[devices[0]!]!.metadata.asset = { homeAssistantEntity: "sensor.tv_power" };
  const methods: string[] = [];
  await page.route("**/ha-test/api/states", async (route) => {
    methods.push(route.request().method());
    await route.fulfill({
      json: [{ entity_id: "sensor.tv_power", state: "42", attributes: { unit_of_measurement: "W" } }],
    });
  });
  await load(page, project);
  await page.getByRole("button", { name: "Home Assistant", exact: true }).click();
  await page.getByLabel("Home-Assistant-Basisadresse").fill("http://127.0.0.1:5173/ha-test");
  await page.getByLabel("Zugriffstoken (nur für diesen Dialog)").fill("test-only-not-a-real-token");
  await page.getByRole("button", { name: "Zustände jetzt abrufen" }).click();
  await expect(page.getByRole("cell", { name: "42 W", exact: true })).toBeVisible();
  expect(methods).toEqual(["GET"]);
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  expect(JSON.stringify(await exported(page))).not.toContain("test-only-not-a-real-token");
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Home Assistant", exact: true }).click();
  await expect(page.getByLabel("Zugriffstoken (nur für diesen Dialog)")).toHaveValue("");
});
test("PDF-Seite importieren und Projektstand wiederherstellen", async ({ page }) => {
  await load(page);
  await page.getByRole("button", { name: "Ausgabe", exact: true }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grundriss als PDF", exact: true }).click();
  const path = await (await event).path();
  expect(path).toBeTruthy();
  await page.getByRole("button", { name: "Grundrissvorlage", exact: true }).click();
  await page.getByLabel("Vorlage importieren", { exact: true }).setInputFiles({
    name: "plan.pdf",
    mimeType: "application/pdf",
    buffer: await import("node:fs/promises").then((fs) => fs.readFile(path!)),
  });
  await expect(page.getByRole("button", { name: "Vorlage speichern", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vorlage speichern", exact: true }).click();
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Wiederherstellung", exact: true }).click();
  await page.getByRole("button", { name: "Wiederherstellen …", exact: true }).first().click();
  await page.getByRole("button", { name: "Diesen Stand jetzt übernehmen" }).click();
  await expect(page.getByText("Projektstand wiederhergestellt.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen" }).click();
  const restored = await exported(page);
  expect(Object.keys(housebook(restored).backgrounds)).toHaveLength(0);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect(Object.keys(housebook(await exported(page)).backgrounds)).toHaveLength(1);
});

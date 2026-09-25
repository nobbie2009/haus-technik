import { test, expect, type Page } from "@playwright/test";
import { createDemoProject } from "../../src/editor/demoProject";
import { addNetworkNode } from "../../src/network/model";
import { housebook, setHousebook } from "../../src/housebook/model";
import type { Project } from "../../src/models/project";
async function load(page: Page, p = createDemoProject()) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await expect(page.getByText(`„${p.name}“ wurde importiert.`)).toBeVisible();
}
async function exported(page: Page): Promise<Project> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Luftbild getrennt importieren, drehen und wieder laden", async ({ page }) => {
  await load(page);
  await page.getByRole("tab", { name: "Grundstück", exact: true }).click();
  await page.getByRole("button", { name: "Luftbild-Unterlage", exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 500;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#80985e";
    ctx.fillRect(0, 0, 800, 500);
    ctx.fillStyle = "#bdbca1";
    ctx.fillRect(280, 0, 55, 500);
    ctx.fillStyle = "#965e45";
    ctx.fillRect(360, 140, 220, 170);
    return c.toDataURL().split(",")[1]!;
  });
  await page.getByLabel("Vorlage importieren").setInputFiles({
    name: "Beispiel-Luftbild.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await page.getByLabel("Drehung im Uhrzeigersinn (°)").fill("15");
  await page.getByLabel("Bildquelle / Aufnahmezeit").fill("Schematische Testgrafik, keine reale Adresse");
  await page.getByRole("button", { name: "Vorlage speichern", exact: true }).click();
  await expect(page.getByText("Vorlage gespeichert.", { exact: true })).toBeVisible();
  const originalViewport = page.viewportSize();
  if (originalViewport && !test.info().project.use.isMobile)
    await page.setViewportSize({ width: originalViewport.width, height: 1500 });
  await page.getByRole("dialog", { name: "Luftbild-Unterlage", exact: true }).evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/spatial-aerial.png" });
  if (originalViewport) await page.setViewportSize(originalViewport);
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  let p = await exported(page);
  expect(housebook(p).aerials?.[p.floorOrder[0]!]?.rotation).toBe(15);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  p = await exported(page);
  expect(housebook(p).aerials?.[p.floorOrder[0]!]?.source).toContain("Testgrafik");
});
test("WLAN-Messkarte speichert Sender, Signal und Geschwindigkeit am gewählten Ort", async ({ page }) => {
  const p = createDemoProject();
  const sender = addNetworkNode(p, p.floorOrder[0]!, { x: 1000, y: 1000 }, "accessPoint");
  await load(page, p);
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByRole("button", { name: "WLAN-Messkarte", exact: true }).click();
  await page.getByLabel("Access Point / Sender").selectOption(sender);
  await page.getByLabel("Messstelle", { exact: true }).fill("Arbeitszimmer");
  await page.getByLabel("Messposition X (mm)").fill("3000");
  await page.getByLabel("Messposition Y (mm)").fill("2000");
  await page.getByLabel("Empfang (dBm)").fill("-58");
  await page.getByLabel("Download (Mbit/s)").fill("185");
  await page.getByRole("button", { name: "Neue Messung speichern" }).click();
  await expect(page.getByText("Messung gespeichert.", { exact: true })).toBeVisible();
  const originalViewport = page.viewportSize();
  if (originalViewport && !test.info().project.use.isMobile)
    await page.setViewportSize({ width: originalViewport.width, height: 1500 });
  await page.getByRole("dialog", { name: "WLAN-Messkarte", exact: true }).evaluate((dialog) => {
    dialog.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/spatial-wifi.png" });
  if (originalViewport) await page.setViewportSize(originalViewport);
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  const result = housebook(await exported(page)).wifiMeasurements[0]!;
  expect(result.sourceId).toBe(sender);
  expect(result.position).toEqual({ x: 3000, y: 2000 });
  expect(result.downloadMbps).toBe(185);
  expect(result.measuredAt).toBeTruthy();
});
test("3D zeigt das Modell und führt zum ausgewählten Objekt im Grundriss", async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const p = createDemoProject();
  await load(page, p);
  await page.getByRole("button", { name: "3D-Hausansicht", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "3D-Hausansicht", exact: true });
  await expect(dialog).toBeVisible();
  if (browserName !== "webkit") await expect(page.getByTestId("house-3d").locator("canvas")).toBeVisible();
  await page.getByLabel("Geschosse auseinanderziehen", { exact: true }).fill("2");
  await page.getByLabel("Wanddeckkraft", { exact: true }).fill("0.4");
  const room = Object.values(p.rooms)[0]!;
  await page.getByLabel("Objekt direkt auswählen").selectOption(`rooms:${room.id}`);
  await expect(dialog.getByRole("status")).toContainText(room.name);
  await page.screenshot({ path: "test-results/spatial-3d.png" });
  await page.getByRole("button", { name: "Im Grundriss bearbeiten", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("Livewerte aktualisieren nach geschlossenem Dialog weiter und lassen sich stoppen", async ({ page }) => {
  const p = createDemoProject();
  Object.values(p.rooms)[0]!.metadata.asset = { homeAssistantEntity: "sensor.demo" };
  let calls = 0;
  await page.route("**/ha-live/api/states", (route) => {
    calls++;
    return route.fulfill({
      json: [
        { entity_id: "sensor.demo", state: String(20 + calls), attributes: { unit_of_measurement: "°C" } },
      ],
    });
  });
  await load(page, p);
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Home Assistant", exact: true }).click();
  await page.getByLabel("Home-Assistant-Basisadresse").fill("http://127.0.0.1:5173/ha-live");
  await page.getByLabel("Zugriffstoken").fill("test-only");
  await page.getByLabel("Livewerte-Intervall").selectOption("5");
  await page.getByRole("button", { name: "Livewerte starten", exact: true }).click();
  await expect(page.getByRole("cell", { name: "21 °C", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/spatial-live.png" });
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect.poll(() => calls, { timeout: 8000 }).toBeGreaterThan(1);
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByText("Home-Assistant-Livewerte", { exact: true }).click();
  await page.getByRole("button", { name: "Livewerte stoppen", exact: true }).click();
  const stopped = calls;
  await page.waitForTimeout(5500);
  expect(calls).toBe(stopped);
  expect(JSON.stringify(await exported(page))).not.toContain("test-only");
});
test("Switch ersetzen erhält Kabel und lässt sich rückgängig machen", async ({ page }) => {
  const p = createDemoProject(),
    floor = p.floorOrder[0]!;
  const id = addNetworkNode(p, floor, { x: 1000, y: 1000 }, "switch"),
    client = addNetworkNode(p, floor, { x: 2000, y: 1000 }, "client");
  const book = housebook(p);
  book.networkLinks.push({
    id: crypto.randomUUID(),
    name: "Arbeitsplatz",
    from: id,
    to: client,
    fromPort: 8,
    toPort: 1,
    cableType: "Cat 6",
    allowance: 0,
  });
  setHousebook(p, book);
  await load(page, p);
  await page.getByRole("button", { name: "3D-Hausansicht", exact: true }).click();
  await page.getByLabel("Objekt direkt auswählen").selectOption(`networkNodes:${id}`);
  await page.getByRole("button", { name: "Im Grundriss bearbeiten", exact: true }).click();
  const properties = page.getByRole("button", { name: "Eigenschaften", exact: true });
  if (await properties.isVisible()) await properties.click();
  await page.getByRole("button", { name: "Gerät ersetzen", exact: true }).click();
  await page.getByLabel("Neuer Gerätename").fill("Switch Ersatz");
  await page.getByLabel("Ports des Ersatzgeräts").fill("4");
  await page.getByRole("button", { name: "Gerät mit diesen Angaben ersetzen" }).click();
  await expect(
    page.getByRole("dialog", { name: "Gerät ersetzen", exact: true }).getByRole("alert"),
  ).toContainText("belegten");
  await page.getByLabel("Ports des Ersatzgeräts").fill("16");
  await page.screenshot({ path: "test-results/spatial-replace.png" });
  await page.getByRole("button", { name: "Gerät mit diesen Angaben ersetzen" }).click();
  const result = housebook(await exported(page));
  expect(result.networkLinks).toEqual(book.networkLinks);
  expect(result.networkNodes.find((n) => n.id === id)?.ports).toBe(16);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  const restored = housebook(await exported(page));
  expect(restored.networkNodes.find((n) => n.id === id)?.ports).toBe(8);
});

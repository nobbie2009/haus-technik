import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { createDemoProject } from "../../src/editor/demoProject";
import { conductorFixture } from "../simulation/conductorFixture";
import { utilities } from "../../src/utilities/model";

async function exportProject(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const stream = await (await event).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
async function tool(page: Page, name: string) {
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page
    .getByRole("navigation", { name: "Zeichenwerkzeuge" })
    .getByRole("button", { name: new RegExp(`^${name} `) })
    .tap();
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
}
test.beforeEach(async ({ page }) => {
  // Same platform constraint as a LAN HTTP origin.
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", { value: undefined }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
});

test("Rohrnetz auf dem iPad per Finger platzieren und verbinden", async ({ page }) => {
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true }).tap();
  await page.getByLabel("Komponentenart", { exact: true }).selectOption("source");
  await page.getByRole("button", { name: "Komponente platzieren", exact: true }).tap();
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.touchscreen.tap(box.x + 250, box.y + 250);
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.getByLabel("Komponentenart", { exact: true }).selectOption("tap");
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.touchscreen.tap(box.x + 520, box.y + 400);
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.getByRole("button", { name: "Rohrleitung zeichnen", exact: true }).tap();
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.touchscreen.tap(box.x + 250, box.y + 250);
  await page.touchscreen.tap(box.x + 250, box.y + 400);
  await page.touchscreen.tap(box.x + 520, box.y + 400);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await expect(page.getByLabel("Rohrmaterial", { exact: true })).toBeVisible();
  await page.getByLabel("Rohrmaterial", { exact: true }).fill("Kupfer");
  await page.getByLabel("Nennweite (DN)", { exact: true }).tap();
  const net = utilities(await exportProject(page));
  expect(Object.values(net.nodes)).toHaveLength(2);
  expect(Object.values(net.pipes)).toHaveLength(1);
  expect(Object.values(net.pipes)[0]).toMatchObject({ medium: "cold", material: "Kupfer" });
  await page.screenshot({ path: "test-results/utilities-ipad.png" });
});

test("Verbraucherbibliothek auf dem iPad anlegen und per Finger platzieren", async ({ page }) => {
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).tap();
  await page.getByRole("button", { name: "Verbraucherdatenbank", exact: true }).tap();
  const dialog = page.getByRole("dialog", { name: "Verbraucherdatenbank", exact: true });
  await dialog.getByLabel("Gerätename", { exact: true }).fill("iPad-Kühlschrank");
  await dialog.getByLabel("Seriennummer", { exact: true }).fill("IPAD-TEST");
  await dialog.getByRole("button", { name: "Verbraucher speichern", exact: true }).tap();
  await dialog.getByRole("button", { name: "iPad-Kühlschrank platzieren", exact: true }).tap();
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  const surface = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.touchscreen.tap(surface.x + 350, surface.y + 240);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await expect(page.getByLabel("Seriennummer", { exact: true })).toHaveValue("IPAD-TEST");
  await page.screenshot({ path: "test-results/consumer-ipad.png" });
});

test("Fehlerstrom-Szenario lässt sich auf dem iPad bedienen", async ({ page }) => {
  const { project } = conductorFixture();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "fehler.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Leiterprüfung", exact: true }).tap();
  await page.getByLabel("Gesamtwiderstand des Fehlerkreises (Ω)").fill("4600");
  await page.getByRole("button", { name: "Fehler simulieren", exact: true }).tap();
  await expect(page.getByText("Im Modell abgeschaltet", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/conductor-ipad.png" });
  await page.getByRole("button", { name: "Fehler bei Testlampe entfernen", exact: true }).tap();
  await expect(page.getByText("Im Modell abgeschaltet", { exact: true })).toHaveCount(0);
});

test("Hochformat, Querformat und Split View bleiben bedienbar", async ({ page }) => {
  for (const size of [
    { width: 810, height: 1080 },
    { width: 1080, height: 810 },
    { width: 600, height: 900 },
  ]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const surface = await page.getByTestId("drawing-surface").boundingBox();
    expect(surface!.width).toBe(size.width);
    expect(surface!.height).toBeGreaterThan(400);
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
    await expect(page.getByRole("complementary", { name: "Eigenschaften" })).toBeVisible();
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
    await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
    const dialog = page.getByRole("dialog", { name: "Hausakte", exact: true });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    await page.screenshot({ path: `test-results/ipad-${size.width}.png` });
    await page.getByRole("button", { name: "Dialog schließen", exact: true }).tap();
  }
});

test("Raum per Finger zeichnen, schließen, speichern und wieder laden", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await tool(page, "Freier Raum");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  for (const [x, y] of [
    [160, 180],
    [480, 180],
    [480, 440],
    [160, 440],
  ]) {
    await page.touchscreen.tap(box.x + x!, box.y + y!);
  }
  await page.getByRole("button", { name: "Raum schließen", exact: true }).tap();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const project = await exportProject(page);
  expect(Object.keys(project.rooms)).toHaveLength(1);
  expect(Object.keys(project.walls)).toHaveLength(4);
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await page.getByLabel("Raumname", { exact: true }).fill("iPad-Raum");
  await page.getByLabel("Raumname", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "Eigenschaften", exact: true }).tap();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const renamed = await exportProject(page);
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  expect((await exportProject(page)).rooms).toEqual(renamed.rooms);
  expect(errors).toEqual([]);
});

test("Projektdatei importieren und PDF als Planvorlage wieder einlesen", async ({ page }) => {
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(createDemoProject())),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).tap();
  await page.getByRole("button", { name: "Ausgabe", exact: true }).tap();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Grundriss als PDF", exact: true }).tap();
  const pdf = await event;
  const stream = await pdf.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  await page.getByRole("button", { name: "Grundrissvorlage", exact: true }).tap();
  await page
    .getByLabel("Vorlage importieren", { exact: true })
    .setInputFiles({ name: "plan.pdf", mimeType: "application/pdf", buffer });
  await expect(page.getByRole("button", { name: "Vorlage speichern", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Vorlage speichern", exact: true }).tap();
  await expect(page.getByText("Vorlage gespeichert.", { exact: true })).toBeVisible();
});

test("Zwei Finger zoomen ohne Platzierung; abgebrochene Geste speichert nichts", async ({ page }) => {
  await tool(page, "Wand");
  const before = await exportProject(page);
  const zoom = page.locator(".canvas-controls span");
  const oldZoom = await zoom.textContent();
  // WebKit automation has no native multi-touch API; exercise the PointerEvent path.
  await page.getByTestId("drawing-surface").evaluate((element) => {
    const host = element as HTMLElement;
    host.setPointerCapture = () => {};
    const rect = host.getBoundingClientRect();
    const send = (type: string, id: number, x: number, y: number) =>
      host.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: "touch",
          pointerId: id,
          button: 0,
          clientX: rect.x + x,
          clientY: rect.y + y,
        }),
      );
    send("pointerdown", 1, 200, 200);
    send("pointerdown", 2, 400, 200);
    send("pointermove", 2, 600, 200);
    send("pointerup", 2, 600, 200);
    send("pointerup", 1, 200, 200);
    send("pointerdown", 3, 300, 300);
    send("pointercancel", 3, 300, 300);
    send("pointerup", 3, 300, 300);
  });
  expect(await zoom.textContent()).not.toBe(oldZoom);
  expect((await exportProject(page)).walls).toEqual(before.walls);
  await expect(page.getByRole("button", { name: "Wandzug beenden" })).toHaveCount(0);
});

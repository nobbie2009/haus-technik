import { test, expect, type Page } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { newSolarPlant, setSolarPlants, solarPlants } from "../../src/housebook/solar";
import { assetSchema } from "../../src/housebook/model";
import { newId } from "../../src/utils/uuid";
import type { Project } from "../../src/models/project";
async function exported(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await event).createReadStream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Vorhandenes Balkonkraftwerk mit Modulen, Wechselrichter und Speicher im Plan zeichnen", async ({
  page,
}) => {
  const project = createProject(),
    plant = newSolarPlant();
  plant.name = "Balkon Süd";
  plant.modules = [{ id: newId(), quantity: 2, wp: 440, asset: assetSchema.parse({}) }];
  setSolarPlants(project, [plant]);
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "solar.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Solaranlage im Plan", { exact: true }).selectOption(plant.id);
  const surface = (await page.getByTestId("drawing-surface").boundingBox())!;
  for (const [kind, x] of [
    ["plant", 200],
    ["module", 370],
    ["module", 530],
    ["inverter", 700],
    ["battery", 870],
  ] as const) {
    await page.getByLabel("Solarobjekt platzieren", { exact: true }).selectOption(kind);
    await page.mouse.click(surface.x + x, surface.y + 250);
  }
  await page.getByLabel("Speicherkapazität (Wh)", { exact: true }).fill("2000");
  await page.getByLabel("Speicherkapazität (Wh)", { exact: true }).press("Enter");
  const stored = await exported(page);
  expect(Object.keys(stored.electrical.devices)).toHaveLength(5);
  expect(solarPlants(stored)).toHaveLength(1);
  expect(solarPlants(stored)[0]!.battery!.capacityWh).toBe(2000);
  await page.getByRole("button", { name: "Zugehörige Solarakte öffnen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Balkonkraftwerk", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByTitle("Auswahl (V)", { exact: true }).click();
  await page.screenshot({ path: "test-results/solar-plan.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  expect((await exported(page)).electrical.devices).toEqual(stored.electrical.devices);
});

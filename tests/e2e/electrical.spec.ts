import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { createProject } from "../../src/core/projectFactory";
import { addFurniture } from "../../src/furniture/actions";

async function exported(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await event).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}
async function field(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Enter");
}

test("Elektrik dokumentieren: Verteiler, Sicherung, Steckdose und Verbraucher", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("distributionBoards");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 160, box.y + 250);
  await field(page, "Elektro-Name", "Verteilung Erdgeschoss");
  await page
    .locator(".right-panel")
    .getByRole("button", { name: "Stromkreise verwalten", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Stromkreise und Schutzgeräte" });
  await dialog.getByRole("button", { name: "Neuer Stromkreis", exact: true }).click();
  await field(page, "Stromkreisname", "Licht / Wohnen 2");
  await field(page, "Stromkreiskennzeichnung", "WZ-02");
  await page.getByLabel("Phase", { exact: true }).selectOption("L1");
  await field(page, "Stromkreisspannung (V)", "230");
  await dialog.getByRole("button", { name: "Neues Schutzgerät", exact: true }).click();
  await field(page, "Sicherungskennzeichnung", "F12");
  await field(page, "Charakteristik", "B");
  await field(page, "Bemessungsstrom (A)", "16");
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("outlets");
  await page.mouse.click(box.x + 320, box.y + 300);
  await expect(page.getByTitle("Elektrik (E)")).toHaveAttribute("aria-pressed", "true");
  await field(page, "Kennzeichnung", "SD-WZ-03");
  await field(page, "Steckdosentyp", "Schuko");
  await page
    .getByLabel("Stromkreis", { exact: true })
    .selectOption({ label: "WZ-02 · Licht / Wohnen 2 · UV-01 · F12" });
  await page.getByLabel("Beschriftung im Plan", { exact: true }).selectOption("circuit");
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("devices");
  await page.mouse.click(box.x + 460, box.y + 330);
  await field(page, "Elektro-Name", "PC");
  await field(page, "Nennleistung (W)", "600");
  const withDevice = await exported(page);
  const outlet = Object.values(withDevice.electrical.outlets)[0]!;
  await page.getByLabel("Anschluss", { exact: true }).selectOption(`outlet:${outlet.id}`);
  await expect(page.getByLabel("Nennspannung (V)", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Nennstrom (A)", { exact: true })).toHaveValue("");
  await page
    .locator(".right-panel")
    .getByRole("button", { name: "Stromkreise verwalten", exact: true })
    .click();
  await expect(dialog.getByText("1 Steckdosen · 1 Verbraucher", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Erfasste Nennleistung: 600 W", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 460, box.y + 330);
  await page.mouse.down();
  await page.mouse.move(box.x + 495, box.y + 330, { steps: 5 });
  await page.mouse.up();
  const moved = await exported(page);
  const device = Object.values(moved.electrical.devices)[0]!;
  expect(device.connectionPointId).toBe(outlet.id);
  expect(device.position.x - Object.values(withDevice.electrical.devices)[0]!.position.x).toBe(500);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Elektrik sperren", exact: true }).click();
  await page
    .getByRole("region", { name: "Ebenen", exact: true })
    .getByRole("button", { name: "Ebenen einklappen", exact: true })
    .click();
  await expect(page.getByLabel("Nennleistung (W)", { exact: true })).toBeDisabled();
  await page
    .locator(".right-panel")
    .getByRole("button", { name: "Stromkreise verwalten", exact: true })
    .click();
  await expect(dialog.getByLabel("Stromkreisname", { exact: true })).toBeDisabled();
  await expect(dialog.getByLabel("Bemessungsstrom (A)", { exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Elektrik entsperren", exact: true }).click();
  await page
    .getByRole("region", { name: "Ebenen", exact: true })
    .getByRole("button", { name: "Ebenen einklappen", exact: true })
    .click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "elektrik.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByText("„Mein Haus“ wurde importiert.")).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  await page.screenshot({ path: "test-results/electrical-desktop.png" });
  expect(errors).toEqual([]);
});

test("Version-2-Möbelprojekt migriert verlustfrei und erlaubt neue Elektroobjekte", async ({ page }) => {
  const current = createProject("Möbelbestand");
  addFurniture(current, current.floorOrder[0]!, { x: 1000, y: 1000 }, "sofa");
  const { electrical: _electrical, ...legacy } = current;
  const layer = Object.values(legacy.layers).find((item) => item.kind === "electrical")!;
  delete legacy.layers[layer.id];
  legacy.layerOrder = legacy.layerOrder.filter((id) => id !== layer.id);
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "v2.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...legacy, schemaVersion: 2 })),
  });
  await expect(page.getByText("„Möbelbestand“ wurde importiert.")).toBeVisible();
  const restored = await exported(page);
  expect(restored.furniture).toEqual(current.furniture);
  expect(restored.id).toBe(current.id);
  expect(restored.schemaVersion).toBe(10);
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 180, box.y + 220);
  await page.mouse.click(box.x + 220, box.y + 220);
  expect(Object.keys((await exported(page)).electrical.outlets)).toHaveLength(2);
  await page.getByTitle("Auswahl (V)").click();
  await page.keyboard.press("Delete");
  expect(Object.keys((await exported(page)).electrical.outlets)).toHaveLength(1);
});

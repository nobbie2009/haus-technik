import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { conductorFixture } from "../simulation/conductorFixture";
import { addElectrical } from "../../src/electrical/actions";
import { consumerLibrary, consumerShape } from "../../src/electrical/consumerLibrary";
import { asset } from "../../src/housebook/model";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("Kühlschrank erfassen, maßstäblich platzieren, anschließen und wieder laden", async ({ page }) => {
  const { project, floor, circuit, board, connect } = conductorFixture();
  const outlet = addElectrical(project, floor, { x: 4500, y: 0 }, "outlets");
  project.electrical.outlets[outlet]!.circuitId = circuit;
  connect(
    board,
    outlet,
    ["L", "N", "PE"].map((p) => [`${circuit}:${p}`, p]),
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "haus.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByRole("button", { name: "Verbraucherdatenbank", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Verbraucherdatenbank", exact: true });
  for (const [label, value] of [
    ["Gerätename", "Kühlschrank"],
    ["Hersteller", "Beispiel"],
    ["Modell", "K600"],
    ["Seriennummer", "TEST-123"],
    ["Nennspannung (V)", "230"],
    ["Nennleistung (W)", "100"],
    ["Jahresverbrauch (kWh/Jahr)", "150"],
  ])
    await dialog.getByLabel(label!, { exact: true }).fill(value!);
  await dialog.getByRole("button", { name: "Verbraucher speichern", exact: true }).click();
  await expect(dialog.getByText("Verbraucher gespeichert.", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/consumer-library.png" });
  await dialog.getByRole("button", { name: "Kühlschrank platzieren", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 400, box.y + 300);
  await expect(page.getByLabel("Seriennummer", { exact: true })).toHaveValue("TEST-123");
  await page.getByLabel("Drehung (°)", { exact: true }).fill("90");
  await page.getByLabel("Drehung (°)", { exact: true }).press("Enter");
  await page.getByLabel("Dokumentierter Betriebszustand", { exact: true }).selectOption("on");
  const placed = await exported(page);
  const device = Object.values(placed.electrical.devices).find((d) => d.name === "Kühlschrank")!;
  expect(consumerShape(device)).toMatchObject({
    width: 600,
    depth: 650,
    rotation: Math.PI / 2,
    annualEnergyKWh: 150,
  });
  await page.getByRole("button", { name: "Anschlussdialog öffnen", exact: true }).click();
  await page.getByLabel("Startobjekt", { exact: true }).selectOption(outlet);
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(device.id);
  await page
    .getByRole("checkbox", { name: "Verbraucher dieser Steckdose zuordnen (Simulation)", exact: true })
    .check();
  await page.getByRole("button", { name: "Verbinden und zuordnen", exact: true }).click();
  const connected = await exported(page);
  expect(connected.electrical.devices[device.id]!.connectionPointId).toBe(outlet);
  const connection = Object.values(connected.electrical.cables).find(
    (c) => c.startNodeId === outlet && c.endNodeId === device.id,
  );
  expect(connection?.conductorConnections).toEqual([
    { startContactId: "L", endContactId: "L" },
    { startContactId: "N", endContactId: "N" },
    { startContactId: "PE", endContactId: "PE" },
  ]);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  const restored = await exported(page);
  expect(asset(restored.electrical.devices[device.id]!).serial).toBe("TEST-123");
  expect(restored.electrical.devices[device.id]).toEqual(connected.electrical.devices[device.id]);
  expect(restored.electrical.cables[connection!.id]).toEqual(connection);
  expect(consumerLibrary(restored)).toHaveLength(1);
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByRole("button", { name: "Verbraucherdatenbank", exact: true }).click();
  await dialog.getByLabel("Verbraucher suchen").fill("TEST-123");
  await expect(dialog.getByRole("button", { name: "Kühlschrank platzieren", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Kühlschrank aus Bibliothek löschen", exact: true }).click();
  await dialog.getByRole("button", { name: "Vorlage endgültig löschen", exact: true }).click();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  expect((await exported(page)).electrical.devices[device.id]).toEqual(
    connected.electrical.devices[device.id],
  );
  expect(errors).toEqual([]);
});

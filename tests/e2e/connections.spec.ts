import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { simulationFixture } from "../simulation/fixture";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}
async function field(page: Page, name: string, value: string) {
  const input = page.getByLabel(name, { exact: true });
  await input.fill(value);
  await input.press("Enter");
}

test("Anschlüsse ziehen, Kontakte bestätigen, simulieren und atomar rückgängig machen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { project, terminal } = simulationFixture([]);
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "anschluss.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  const a = { x: box.x + 160, y: box.y + 260 },
    b = { x: box.x + 400, y: box.y + 260 };
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("switches");
  await page.mouse.click(a.x, a.y);
  await page.getByLabel("Schalter-Stromkreis", { exact: true }).selectOption(terminal);
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("devices");
  await page.mouse.click(b.x, b.y);
  await field(page, "Elektro-Name", "Deckenlicht");
  await field(page, "Nennleistung (W)", "25");
  await page.getByLabel("Dokumentierter Betriebszustand", { exact: true }).selectOption("on");
  const before = await exported(page);
  const lightSwitch = Object.values(before.electrical.switches)[0]!;
  const device = Object.values(before.electrical.devices)[0]!;
  const drag = async (reverse = false) => {
    await page.getByTitle("Anschließen (A)", { exact: true }).click();
    const start = reverse ? b : a,
      end = reverse ? a : b;
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };
  await drag();
  const dialog = page.getByRole("dialog", { name: "Anschlüsse verbinden" });
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Verbindung 1 · Startkontakt", { exact: true })).toHaveValue("L_OUT");
  await dialog.getByRole("button", { name: "Abbrechen", exact: true }).click();
  expect(await exported(page)).toEqual(before);
  // Escape während des Ziehens darf weder ein Objekt verschieben noch einen Anschluss erzeugen.
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(dialog).not.toBeVisible();
  expect(await exported(page)).toEqual(before);
  await drag(true);
  await expect(
    page.getByLabel("Verbindung 1 · Startkontakt", { exact: true }).locator('option[value="N"]'),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Verbraucher diesem Lichtschalter zuordnen (Simulation)", exact: true })
    .check();
  await page.getByLabel("Verbindung 1 · Startkontakt", { exact: true }).selectOption("L");
  await page.screenshot({ path: "test-results/contact-dialog-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "test-results/contact-dialog-compact.png" });
  await dialog.getByRole("button", { name: "Verbinden und zuordnen", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const connected = await exported(page);
  const cable = Object.values(connected.electrical.cables)[0]!;
  expect(cable.conductorConnections).toEqual([{ startContactId: "L", endContactId: "L_OUT" }]);
  expect(connected.electrical.devices[device.id]!.switchId).toBe(lightSwitch.id);
  expect(connected.electrical.devices[device.id]!.circuitId).toBe(terminal);
  expect(connected.electrical.devices[device.id]!.position).toEqual(device.position);
  await page.getByRole("button", { name: "Anschlussbelegung bearbeiten", exact: true }).click();
  await expect(page.getByLabel("Verbindung 1 · Zielkontakt", { exact: true })).toHaveValue("L_OUT");
  await page.keyboard.press("Escape");
  expect(await exported(page)).toEqual(connected);
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByLabel("Simulierter Stromkreis", { exact: true }).selectOption(terminal);
  await expect(page.getByTestId("simulation-total-power")).toHaveText("25 W");
  await page.getByLabel("S-01 Lichtschalter geschlossen", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("0 W");
  await page
    .getByRole("dialog", { name: "Stromkreissimulation" })
    .getByRole("button", { name: "Simulation beenden", exact: true })
    .click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  const deleted = await exported(page);
  expect(deleted.electrical.cables).toEqual({});
  expect(deleted.electrical.devices[device.id]!.switchId).toBeNull();
  expect(deleted.electrical.devices[device.id]!.circuitId).toBeNull();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).electrical).toEqual(connected.electrical);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  // Dialog ist auch ohne Ziehen vollständig bedienbar.
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByRole("button", { name: "Anschlussdialog öffnen", exact: true }).click();
  await page.getByLabel("Startobjekt", { exact: true }).selectOption(lightSwitch.id);
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(device.id);
  await expect(page.getByLabel("Verbindung 1 · Startkontakt", { exact: true })).toHaveValue("L_OUT");
  await page.keyboard.press("Escape");
  expect(await exported(page)).toEqual(saved);
  expect(errors).toEqual([]);
});

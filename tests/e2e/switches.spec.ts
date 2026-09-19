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

test("Lichtschalter platzieren, Lampen zuordnen, simulieren und verlustfrei speichern", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { project, devices, terminal } = simulationFixture([25, 40, 100]);
  for (const [index, id] of devices.slice(0, 2).entries())
    Object.assign(project.electrical.devices[id]!, {
      name: `Deckenlampe ${index + 1}`,
      type: "lamp",
      connectionPointId: null,
      circuitId: terminal,
    });
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "lampen.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("switches");
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 180, box.y + 270);
  await expect(page.getByLabel("Elektroobjekt", { exact: true })).toHaveValue("switches");
  await page.getByLabel("Schalter-Stromkreis", { exact: true }).selectOption(terminal);
  await page.getByRole("checkbox", { name: "VG-01 · Deckenlampe 1", exact: true }).check();
  await page.getByRole("checkbox", { name: "VG-02 · Deckenlampe 2", exact: true }).check();
  await expect(page.getByLabel("Schalter-Stromkreis", { exact: true })).toBeDisabled();
  await page.getByLabel("Dokumentierte Schalterstellung", { exact: true }).selectOption("open");
  await page.screenshot({ path: "test-results/switch-properties.png" });
  const before = await exported(page);
  const lightSwitch = Object.values(before.electrical.switches)[0]!;
  expect(before.electrical.devices[devices[0]!]!.switchId).toBe(lightSwitch.id);
  expect(before.electrical.devices[devices[1]!]!.switchId).toBe(lightSwitch.id);
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Stromkreissimulation" });
  await page.getByLabel("Simulierter Stromkreis", { exact: true }).selectOption(terminal);
  await expect(page.getByTestId("simulation-total-power")).toHaveText("100 W");
  await page.getByLabel("S-01 Lichtschalter geschlossen", { exact: true }).check();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("165 W");
  await page.getByLabel("VG-01 im Szenario einschalten", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("140 W");
  await page.getByLabel("F2 geschlossen", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("0 W");
  await page.getByLabel("F2 geschlossen", { exact: true }).check();
  await page.setViewportSize({ width: 1024, height: 768 });
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/switch-simulation-compact.png" });
  await dialog.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Im Szenario ausschalten", exact: true }).click();
  await expect(page.getByText("Simulation: Schalter aus", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Im Szenario einschalten", exact: true }).click();
  await page.screenshot({ path: "test-results/switch-plan.png" });
  expect(await exported(page)).toEqual(before);
  await page.getByRole("button", { name: "Simulation beenden", exact: true }).click();
  await page.getByTitle("Auswahl (V)").click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  const removed = await exported(page);
  expect(removed.electrical.switches).toEqual({});
  expect(removed.electrical.devices[devices[0]!]!.switchId).toBeNull();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const restored = await exported(page);
  expect(restored.electrical).toEqual(before.electrical);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(restored);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "schalter.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(restored)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  expect(await exported(page)).toEqual(restored);
  expect(errors).toEqual([]);
});

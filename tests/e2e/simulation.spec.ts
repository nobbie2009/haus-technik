import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
import type { Project } from "../../src/models/project";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}

test("Stromkreis simulieren: Lasten, Überlast, Sicherung, Phase und unveränderte Bestandsdaten", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { project, devices, terminal } = simulationFixture([130, 600, 25, 1500, 2300]);
  project.electrical.devices[devices[4]!]!.operatingMode = "off";
  project.electrical.devices[devices[4]!]!.name = "Heizlüfter";
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "simulation.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  const before = await exported(page);
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Stromkreissimulation" });
  await page.getByLabel("Simulierter Stromkreis", { exact: true }).selectOption(terminal);
  await expect(page.getByTestId("simulation-total-power")).toHaveText("2.255 W");
  await expect(page.getByTestId("simulation-max-current")).toHaveText("9,80 A");
  await expect(page.getByLabel("F2 Auslastung", { exact: true })).toHaveText("61,3 %");
  await expect(dialog.getByText(/Schätzung: Für mindestens/)).toBeVisible();
  await page.screenshot({ path: "test-results/simulation-desktop.png" });
  await page.getByLabel("VG-04 im Szenario einschalten", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("755 W");
  await page.getByLabel("F2 geschlossen", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("0 W");
  await expect(dialog.getByRole("cell", { name: /Ohne Versorgung/ })).toHaveCount(3);
  await dialog.getByRole("button", { name: "Szenario zurücksetzen", exact: true }).click();
  await page.getByLabel("NETZ-01 L1 aktiv", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("0 W");
  await page.getByLabel("NETZ-01 L1 aktiv", { exact: true }).check();
  await page.getByLabel("Stromkreis verbunden", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-max-current")).toHaveText("0,00 A");
  await page.getByLabel("Stromkreis verbunden", { exact: true }).check();
  await page.getByLabel("VG-05 im Szenario einschalten", { exact: true }).check();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("4.555 W");
  await expect(page.getByLabel("F2 Auslastung", { exact: true })).toHaveText("123,8 %");
  await expect(dialog.getByText("Nennstrom überschritten", { exact: true })).toBeVisible();
  await expect(page.getByLabel("F2 geschlossen", { exact: true })).toBeChecked();
  await page.getByLabel("Fehlenden Leistungsfaktor mit 1 annehmen", { exact: true }).uncheck();
  await expect(page.getByTestId("simulation-max-current")).toHaveText("Nicht berechenbar");
  await expect(dialog.getByText(/5 Verbraucher unvollständig/)).toBeVisible();
  await dialog.getByRole("button", { name: "Szenario zurücksetzen", exact: true }).click();
  await dialog.getByRole("button", { name: "Alle aus", exact: true }).click();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("0 W");
  await dialog.getByRole("button", { name: "Alle ein", exact: true }).click();
  await expect(page.getByTestId("simulation-total-power")).toHaveText("4.555 W");
  await page.setViewportSize({ width: 1024, height: 768 });
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/simulation-compact.png" });
  await dialog.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await expect(page.getByText("Simulation aktiv", { exact: true })).toBeVisible();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.screenshot({ path: "test-results/simulation-plan.png" });
  expect(await exported(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "Rückgängig", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Elektrik-Projektstandard", exact: true }).click();
  await page.getByLabel("Standardspannung L–N (V)", { exact: true }).fill("240");
  await page.getByLabel("Standardspannung L–N (V)", { exact: true }).press("Enter");
  await page.getByRole("dialog").getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByText("Simulation aktiv", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Simulation beenden", exact: true }).click();
  await expect(page.getByText("Simulation aktiv", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

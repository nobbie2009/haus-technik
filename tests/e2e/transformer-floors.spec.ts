import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical } from "../../src/electrical/actions";

test("Klingeltrafo zuordnen und eine Leitung vom EG ins OG zeichnen", async ({ page }) => {
  const { project, terminal, devices, main, sub, branch } = simulationFixture([4]);
  // Kasten wirklich im EG: keine Unterverteilung im OG nötig.
  project.electrical.circuits[terminal]!.distributionBoardId = main;
  project.electrical.protectionDevices[branch]!.distributionBoardId = main;
  project.electrical.distributionBoards[sub]!.upstreamCircuitId = null;
  const transformer = addElectrical(project, project.floorOrder[0]!, { x: 3000, y: 1500 }, "transformers");
  const device = devices[0]!;
  Object.assign(project.electrical.devices[device]!, {
    name: "Klingel OG",
    connectionPointId: null,
    circuitId: terminal,
    ratedVoltage: 8,
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "trafo.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".object-list > summary").click();
  await page
    .locator(".object-list")
    .getByRole("button", { name: "Klingeltransformator", exact: true })
    .click();
  await page.getByLabel("Trafo-Primärstromkreis", { exact: true }).selectOption(terminal);
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list").getByRole("button", { name: "Klingel OG", exact: true }).click();
  await page.getByLabel("Transformator", { exact: true }).selectOption(transformer);
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("8 V");
  await page.getByRole("button", { name: "Anschlussdialog öffnen", exact: true }).click();
  await page.getByLabel("Startobjekt", { exact: true }).selectOption(transformer);
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(device);
  await page.getByRole("button", { name: "Leitungsweg speichern", exact: true }).click();
  await expect(page.getByText("Geschossübergang", { exact: true })).toBeVisible();
  await expect(page.locator(".circuit-summary").filter({ hasText: "Planlänge:" })).toContainText("3,000 m");
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await page.screenshot({ path: "test-results/cable-og.png" });
  await page.locator(".floor-item").filter({ hasText: "Erdgeschoss" }).click();
  await page.locator(".object-list").getByRole("button", { name: "Leitung", exact: true }).click();
  await expect(page.getByText("Geschossübergang", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await page.screenshot({ path: "test-results/cable-eg.png" });
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByLabel("Simulierter Stromkreis", { exact: true }).selectOption(terminal);
  await expect(page.getByRole("dialog", { name: "Stromkreissimulation" })).toContainText("Klingel OG");
  await page.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await page
    .locator(".object-list")
    .getByRole("button", { name: "Klingeltransformator", exact: true })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Sekundärlast:" })).toContainText("0,5 A");
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await expect(page.getByLabel("VG-01 Betriebsanzeige", { exact: true })).toHaveText("In Betrieb");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Leitung", exact: true }).click();
  await expect(page.getByText("Geschossübergang", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

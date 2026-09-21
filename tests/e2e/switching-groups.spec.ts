import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical } from "../../src/electrical/actions";

test("Wechsel/Kreuz und Stromstoßrelais über dieselben drei Schaltstellen", async ({ page }) => {
  const { project, upper, terminal, devices, sub, outlet } = simulationFixture([25]);
  project.electrical.distributionBoards[sub]!.position = { x: 2000, y: -2000 };
  project.electrical.outlets[outlet]!.position = { x: 4000, y: -2000 };
  const group = addElectrical(project, upper.id, { x: 0, y: -2000 }, "controls");
  project.electrical.controls[group]!.name = "Flursteuerung";
  for (let i = 0; i < 3; i++) {
    const id = addElectrical(project, upper.id, { x: 1500 * i, y: 0 }, "switches");
    project.electrical.switches[id]!.circuitId = terminal;
  }
  Object.assign(project.electrical.devices[devices[0]!]!, {
    name: "Flurlicht",
    type: "lamp",
    position: { x: 4500, y: 0 },
    connectionPointId: null,
    circuitId: terminal,
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "gruppen.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Flursteuerung", exact: true }).click();
  await page.getByLabel("Schaltungs-Stromkreis", { exact: true }).selectOption(terminal);
  for (const label of ["S-01", "S-02", "S-03"])
    await page.getByRole("checkbox", { name: new RegExp(label) }).check();
  await page.getByRole("checkbox", { name: "VG-01 · Flurlicht", exact: true }).check();
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  const status = page.getByLabel("VG-01 Betriebsanzeige", { exact: true });
  await expect(status).toHaveText("Leuchtet");
  for (const label of ["S-01", "S-02", "S-03"]) {
    const sw = page.getByRole("switch", { name: `${label} im Plan schalten`, exact: true });
    await sw.click();
    await expect(status).toHaveText("Ohne Versorgung");
    await sw.press("Space");
    await expect(status).toHaveText("Leuchtet");
  }
  await page.screenshot({ path: "test-results/changeover.png" });
  await page.getByRole("button", { name: "Simulation beenden", exact: true }).click();
  await page.getByLabel("Schaltungsart", { exact: true }).selectOption("impulseRelay");
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await expect(status).toHaveText("Ohne Versorgung");
  await page.getByRole("button", { name: "S-01 im Plan betätigen", exact: true }).click();
  await expect(status).toHaveText("Leuchtet");
  await page.getByRole("button", { name: "S-02 im Plan betätigen", exact: true }).press("Enter");
  await expect(status).toHaveText("Ohne Versorgung");
  await page.getByRole("button", { name: "S-03 im Plan betätigen", exact: true }).click();
  await expect(status).toHaveText("Leuchtet");
  await page.screenshot({ path: "test-results/relay.png" });
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByLabel("F2 geschlossen", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await page.getByRole("button", { name: "S-01 im Plan betätigen", exact: true }).click();
  await expect(status).toHaveText("Ohne Versorgung");
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByLabel("F2 geschlossen", { exact: true }).check();
  await page.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await expect(status).toHaveText("Leuchtet");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Flursteuerung", exact: true }).click();
  await expect(page.getByLabel("Schaltungsart", { exact: true })).toHaveValue("impulseRelay");
  await expect(page.getByRole("checkbox", { name: "VG-01 · Flurlicht", exact: true })).toBeChecked();
  expect(errors).toEqual([]);
});

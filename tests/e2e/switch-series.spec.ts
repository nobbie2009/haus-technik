import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { simulationFixture } from "../simulation/fixture";
import { addElectrical } from "../../src/electrical/actions";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}

test("Drei Schalter in Reihe zuordnen und direkt im Plan gemeinsam eine Lampe steuern", async ({ page }) => {
  const { project, upper, terminal, devices, outlet, sub } = simulationFixture([25]);
  project.electrical.outlets[outlet]!.position = { x: 4000, y: -2000 };
  project.electrical.distributionBoards[sub]!.position = { x: 2000, y: -2000 };
  const names = ["Schalter Eins", "Schalter Zwei", "Schalter Drei"];
  const switches = names.map((name, i) => {
    const id = addElectrical(project, upper.id, { x: 1500 * i, y: 0 }, "switches");
    Object.assign(project.electrical.switches[id]!, { name, circuitId: terminal });
    return id;
  });
  Object.assign(project.electrical.devices[devices[0]!]!, {
    name: "LICHT",
    type: "lamp",
    position: { x: 4500, y: 0 },
    connectionPointId: null,
    circuitId: terminal,
    switchId: switches[2],
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "reihe.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  for (let i = 1; i < 3; i++) {
    await page.locator(".object-list").getByRole("button", { name: names[i]!, exact: true }).click();
    await page
      .getByLabel("Schalterversorgung / Reihenschaltung", { exact: true })
      .selectOption(switches[i - 1]!);
  }
  await expect(page.getByLabel("Schalterkette", { exact: true })).toHaveText("S-01 → S-02 → S-03");
  const saved = await exported(page);
  expect(saved.electrical.switches[switches[2]!]!.supply).toEqual({ kind: "switch", switchId: switches[1] });
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Stromkreissimulation" })
    .getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true })
    .click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  const status = page.getByLabel("VG-01 Betriebsanzeige", { exact: true });
  await expect(status).toHaveText("Leuchtet");
  const controls = ["S-01", "S-02", "S-03"].map((name) =>
    page.getByRole("switch", { name: `${name} im Plan schalten`, exact: true }),
  );
  for (const control of controls) {
    await control.click();
    await expect(status).toHaveText("Ohne Versorgung");
    await control.click();
    await expect(status).toHaveText("Leuchtet");
  }
  await page.screenshot({ path: "test-results/series-on.png" });
  await controls[0]!.click();
  await controls[1]!.click();
  await controls[0]!.click();
  await expect(status).toHaveText("Ohne Versorgung");
  await page.screenshot({ path: "test-results/series-interrupted.png" });
  expect(await exported(page)).toEqual(saved);
  await page.getByRole("button", { name: "Simulation beenden", exact: true }).click();
  await page.locator(".object-list").getByRole("button", { name: "Schalter Zwei", exact: true }).click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  expect((await exported(page)).electrical.switches[switches[2]!]!.supply).toEqual({ kind: "disconnected" });
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).electrical).toEqual(saved.electrical);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const restored = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(restored);
  expect(errors).toEqual([]);
});

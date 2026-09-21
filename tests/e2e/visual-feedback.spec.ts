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

test("Schalter direkt im Plan: Lampen leuchten, Verbraucher zeigen Betrieb und fallen ohne Versorgung ab", async ({
  page,
}) => {
  const { project, devices, upper, terminal, sub, outlet } = simulationFixture([25, 600]);
  const lightSwitch = addElectrical(project, upper.id, { x: 0, y: 0 }, "switches");
  Object.assign(project.electrical.switches[lightSwitch]!, { circuitId: terminal, closed: false });
  project.electrical.distributionBoards[sub]!.position = { x: 2000, y: -2000 };
  project.electrical.outlets[outlet]!.position = { x: 4000, y: -2000 };
  for (const [i, id] of devices.entries())
    Object.assign(project.electrical.devices[id]!, {
      name: i === 0 ? "LICHT" : "Computer",
      type: "other",
      position: { x: 2000 + i * 2000, y: 0 },
      connectionPointId: null,
      circuitId: terminal,
      switchId: lightSwitch,
    });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "licht.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  const before = await exported(page);
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Stromkreissimulation" });
  await dialog.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await page.locator(".object-list > summary").click();
  const lampStatus = page.getByLabel("VG-01 Betriebsanzeige", { exact: true });
  const deviceStatus = page.getByLabel("VG-02 Betriebsanzeige", { exact: true });
  await expect(lampStatus).toHaveText("Ohne Versorgung");
  const control = page.getByRole("switch", { name: "S-01 im Plan schalten", exact: true });
  await expect(control).not.toBeChecked();
  // Die Objektpositionen und Fit-Ansicht sind bekannt; wir prüfen die tatsächliche gelbe Canvas-Füllung.
  const lampPixel = async () => {
    const box = (await page.getByTestId("drawing-surface").boundingBox())!;
    const scale = Math.min(1, (box.width - 160) / 4000, (box.height - 180) / 2000);
    const point = { x: box.width / 2 + 4, y: box.height / 2 - 1000 * scale + 12 };
    return page
      .locator(".drawing-host canvas")
      .last()
      .evaluate((element, p) => {
        const canvas = element as HTMLCanvasElement;
        const ratio = canvas.width / canvas.getBoundingClientRect().width;
        return Array.from(
          canvas.getContext("2d")!.getImageData(Math.round(p.x * ratio), Math.round(p.y * ratio), 1, 1).data,
        );
      }, point);
  };
  await page.screenshot({ path: "test-results/feedback-off.png" });
  const offPixel = await lampPixel();
  await control.click();
  await expect(control).toBeChecked();
  await expect(lampStatus).toHaveText("Leuchtet");
  await expect(deviceStatus).toHaveText("In Betrieb");
  await expect.poll(async () => (await lampPixel())[2]).toBeLessThan(150);
  expect((await lampPixel())[0]).toBeGreaterThan(200);
  expect(await lampPixel()).not.toEqual(offPixel);
  await page.screenshot({ path: "test-results/feedback-on.png" });
  // Tastaturbedienung verändert nur das Szenario, keine Positionen oder Projektdaten.
  await control.focus();
  await page.keyboard.press("Space");
  await expect(control).not.toBeChecked();
  await expect(lampStatus).toHaveText("Ohne Versorgung");
  await page.keyboard.press("Enter");
  await expect(control).toBeChecked();
  await page.getByRole("button", { name: "Stromkreis simulieren", exact: true }).click();
  await page.getByLabel("F2 geschlossen", { exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Ergebnis im Plan ansehen", exact: true }).click();
  await expect(control).toBeChecked();
  await expect(lampStatus).toHaveText("Ohne Versorgung");
  await expect(deviceStatus).toHaveText("Ohne Versorgung");
  await expect.poll(lampPixel).toEqual(offPixel);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole("button", { name: "Alles anzeigen", exact: true }).click();
  await expect(control).toBeVisible();
  await page.screenshot({ path: "test-results/feedback-compact.png" });
  expect(await exported(page)).toEqual(before);
  await page.getByRole("button", { name: "Simulation beenden", exact: true }).click();
  await expect(control).toHaveCount(0);
  await page.locator(".object-list").getByRole("button", { name: "LICHT", exact: true }).click();
  await page.getByLabel("Symbol im Plan", { exact: true }).selectOption("device");
  const styled = await exported(page);
  expect(styled.electrical.devices[devices[0]!]!.metadata.electricalSymbol).toBe("device");
  expect(styled.electrical.devices[devices[0]!]!.type).toBe("other");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(styled);
  expect(errors).toEqual([]);
});

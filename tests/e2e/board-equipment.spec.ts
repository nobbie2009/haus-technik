import { test, expect } from "@playwright/test";
import { simulationFixture } from "../simulation/fixture";

test("Sicherungsvorlagen und Mehrfach-Klingeltrafo im Kasten speichern", async ({ page }) => {
  const { project, terminal, devices } = simulationFixture([3]);
  Object.assign(project.electrical.devices[devices[0]!]!, {
    name: "Klingel",
    connectionPointId: null,
    circuitId: terminal,
    ratedVoltage: 12,
    powerFactor: 1,
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "kasten.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Etagenverteiler", exact: true }).click();
  await page.getByLabel("Sicherungsvorlage", { exact: true }).selectOption("C16-3");
  await page.getByRole("button", { name: "Sicherung aus Vorlage hinzufügen", exact: true }).click();
  await expect(page.getByLabel("Pole", { exact: true })).toHaveValue("3");
  await expect(page.getByLabel("Charakteristik", { exact: true })).toHaveValue("C");
  await page.getByLabel("Sicherungsvorlage", { exact: true }).selectOption("RCBO16");
  await page.getByRole("button", { name: "Sicherung aus Vorlage hinzufügen", exact: true }).click();
  await expect(page.getByLabel("Schutzgerätetyp", { exact: true })).toHaveValue("RCBO");
  await expect(page.getByLabel("Bemessungsdifferenzstrom (mA)", { exact: true })).toHaveValue("30");
  await page.getByLabel("Schutzgerät im Kasten bearbeiten", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Klingeltrafo 6 / 9 / 12 / 24 V hinzufügen", exact: true }).click();
  await page.getByLabel("Trafo-Primärstromkreis", { exact: true }).selectOption(terminal);
  const transformer = await page
    .getByLabel("Klingeltrafo im Kasten bearbeiten", { exact: true })
    .inputValue();
  await expect(page.getByText("Ausgänge: 6 / 9 / 12 / 24 V", { exact: true })).toBeVisible();
  await page.getByLabel("Trafo-Primärstromkreis", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/board-equipment-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByLabel("Trafo-Primärstromkreis", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/board-equipment-compact.png" });
  await page.locator(".object-list").getByRole("button", { name: "Klingel", exact: true }).click();
  await page.getByLabel("Transformator", { exact: true }).selectOption(transformer);
  await page.getByLabel("Trafoausgang", { exact: true }).selectOption("12");
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("12 V");
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByLabel("Trafoausgang", { exact: true })).toHaveValue("6");
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await expect(page.getByLabel("Trafoausgang", { exact: true })).toHaveValue("12");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await page.locator(".object-list > summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Klingel", exact: true }).click();
  await expect(page.getByLabel("Trafoausgang", { exact: true })).toHaveValue("12");
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("12 V");
  expect(errors).toEqual([]);
});

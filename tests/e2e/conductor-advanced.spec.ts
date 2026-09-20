import { test, expect } from "@playwright/test";
import { conductorFixture, relayConductorFixture } from "../simulation/conductorFixture";

test("Verdrahteter Taster schaltet das Relais; Fehlerstrom schaltet den FI im Modell ab", async ({
  page,
}) => {
  const { project } = relayConductorFixture();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "verdrahtet.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Leiterprüfung", exact: true }).click();
  await expect(page.getByText("Kontakt offen", { exact: false })).toBeVisible();
  await page.getByText("Schalterstellungen testen", { exact: true }).click();
  await page.getByRole("button", { name: "Tastimpuls · T1", exact: true }).click();
  await expect(
    page.getByText("1 Relais durch verdrahteten Tastimpuls umgeschaltet.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "In Betrieb", exact: true })).toBeVisible();
  await page.getByLabel("Gesamtwiderstand des Fehlerkreises (Ω)").fill("4600");
  await page.getByRole("button", { name: "Fehler simulieren", exact: true }).click();
  await expect(page.getByText("Im Modell abgeschaltet", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "50.00 mA", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Nicht versorgt", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/conductor-fault-desktop.png" });
  await page.getByRole("button", { name: "Szenarien", exact: true }).click();
  await page.getByLabel("Szenarioname").fill("Isolationsfehler");
  await page.getByRole("button", { name: "Aktuellen Zustand speichern", exact: true }).click();
  await expect(page.getByText("Szenario gespeichert.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Szenarien", exact: true }).click();
  await page.getByRole("button", { name: "Im Plan laden", exact: true }).click();
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Leiterprüfung", exact: true }).click();
  await expect(page.getByText("Im Modell abgeschaltet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fehler bei Testlampe entfernen", exact: true }).click();
  await expect(page.getByRole("cell", { name: "In Betrieb", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("L–N-Rückstrom und ungültige Widerstände bleiben nachvollziehbar", async ({ page }) => {
  const { project } = conductorFixture();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hausakte", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "verdrahtet.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("button", { name: "Hausakte", exact: true }).click();
  await page.getByRole("button", { name: "Leiterprüfung", exact: true }).click();
  const resistance = page.getByLabel("Gesamtwiderstand des Fehlerkreises (Ω)");
  await resistance.fill("0");
  await page.getByRole("button", { name: "Fehler simulieren", exact: true }).click();
  await expect(page.getByRole("button", { name: "Fehler bei Testlampe entfernen", exact: true })).toHaveCount(
    0,
  );
  await resistance.fill("4600");
  await page.getByLabel("Fehlerart", { exact: true }).selectOption("line-neutral");
  await page.getByRole("button", { name: "Fehler simulieren", exact: true }).click();
  await expect(page.getByText("Fehler weiterhin aktiv", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "0.00 mA", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Unter Modellschwelle", exact: true })).toBeVisible();
});

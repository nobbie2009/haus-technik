import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { distributionFixture } from "../electrical/distributionFixture";
import type { Project } from "../../src/models/project";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}
async function selectObject(page: Page, name: string) {
  const list = page.locator(".object-list");
  if (!(await list.evaluate((element) => (element as HTMLDetailsElement).open)))
    await list.locator("summary").click();
  await list.getByRole("button", { name, exact: true }).click();
}

test("Unterverteilung zuordnen, vorgeschaltete Sicherung ändern und Zuleitung wiederherstellen", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { project, sub, main, feeder, terminal } = distributionFixture();
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "verteilung.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.getByText("„Haupt- und Unterverteilung“ wurde importiert.")).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  await selectObject(page, "Etagenverteiler");
  const input = page.getByLabel("Versorgung des Sicherungskastens", { exact: true });
  await expect(input.locator(`option[value="circuit:${terminal}"]`)).toHaveCount(0);
  await input.selectOption(`circuit:${feeder}`);
  await page.locator(".right-panel").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/distribution-desktop.png" });
  await selectObject(page, "Steckdose");
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("230 V");
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("16 A");
  await expect(page.getByRole("region", { name: "Geplante Versorgung" })).toContainText(
    "UV-01 → F1 → SK-01 → UV-02 → F2 → SK-02",
  );
  await page
    .locator(".left-panel")
    .getByRole("button", { name: "Stromkreise verwalten", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await page.getByLabel("Sicherungskasten", { exact: true }).selectOption(main);
  await page.getByLabel("Bemessungsstrom (A)", { exact: true }).fill("10");
  await page.getByLabel("Bemessungsstrom (A)", { exact: true }).press("Enter");
  // Umhängen der Zuleitung in die von ihr versorgte Unterverteilung muss atomar scheitern.
  await page.getByLabel("Verteilerzuordnung", { exact: true }).selectOption(sub);
  await expect(dialog.getByRole("alert")).toContainText("keinen Kreis");
  await expect(page.getByLabel("Verteilerzuordnung", { exact: true })).toHaveValue(main);
  await dialog.getByRole("button", { name: "UV-02 im Plan anzeigen", exact: true }).click();
  await expect(page.getByLabel("Elektro-Name", { exact: true })).toHaveValue("Etagenverteiler");
  await selectObject(page, "Steckdose");
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("10 A");
  await page
    .locator(".left-panel")
    .getByRole("button", { name: "Stromkreise verwalten", exact: true })
    .click();
  await page.getByLabel("Sicherungskasten", { exact: true }).selectOption(main);
  await dialog.getByRole("button", { name: "Stromkreis löschen und Zuordnungen lösen", exact: true }).click();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  expect((await exported(page)).electrical.distributionBoards[sub]!.upstreamCircuitId).toBeNull();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("10 A");
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator(".right-panel").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/distribution-compact.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  expect(errors).toEqual([]);
});

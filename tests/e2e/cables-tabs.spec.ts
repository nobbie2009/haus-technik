import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { Project } from "../../src/models/project";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}
async function field(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel(label, { exact: true }).press("Enter");
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
});

test("Tabs begrenzen Auswahl und Bearbeitung auch bei überlappenden Objekten", async ({ page }) => {
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await expect(page.getByRole("tab", { name: "Haus / Raum", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByTitle("Rechteckraum (R)").click();
  await page.mouse.click(box.x + 160, box.y + 200);
  await page.mouse.click(box.x + 510, box.y + 440);
  await expect(page.getByLabel("Raumname", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await expect(page.getByLabel("Raumname", { exact: true })).not.toBeVisible();
  await expect(page.getByTitle("Wand (W)")).toHaveCount(0);
  await page.mouse.click(box.x + 300, box.y + 320);
  await expect(page.getByLabel("Objektname", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await expect(page.getByLabel("Objektname", { exact: true })).not.toBeVisible();
  await expect(page.getByLabel("Objektvorlage")).toHaveCount(0);
  await page.mouse.click(box.x + 300, box.y + 320);
  const before = await exported(page);
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 300, box.y + 320);
  await page.mouse.down();
  await page.mouse.move(box.x + 335, box.y + 320, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Elektro-Name", { exact: true })).toBeVisible();
  const moved = await exported(page);
  expect(moved.furniture).toEqual(before.furniture);
  expect(moved.points).toEqual(before.points);
  expect(
    Object.values(moved.electrical.outlets)[0]!.position.x -
      Object.values(before.electrical.outlets)[0]!.position.x,
  ).toBe(500);
  await page.mouse.move(box.x + 160, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 195, box.y + 200, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel("Raumname", { exact: true })).not.toBeVisible();
  expect((await exported(page)).points).toEqual(before.points);
  await page.locator(".object-list summary").click();
  await expect(page.locator(".object-list button")).toHaveCount(1);
  await page.locator(".object-list button").click();
  await expect(page.getByLabel("Elektro-Name", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.keyboard.press("Delete");
  expect((await exported(page)).furniture).toEqual(before.furniture);
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.click(box.x + 335, box.y + 320);
  await expect(page.getByLabel("Objektname", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Elektro-Name", { exact: true })).not.toBeVisible();
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).click();
  await page.mouse.click(box.x + 335, box.y + 320);
  await expect(page.getByLabel("Raumname", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Haus / Raum", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Elektrik", exact: true })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Elektrik", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.screenshot({ path: "test-results/category-tabs-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole("tab", { name: "Möbel", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/category-tabs-compact.png" });
});

test("Leitungen zeichnen, bemaßen, Endobjekte bewegen und verlustfrei speichern", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("distributionBoards");
  await page.mouse.click(box.x + 160, box.y + 250);
  await page.getByLabel("Elektroobjekt", { exact: true }).selectOption("junctions");
  await page.mouse.click(box.x + 510, box.y + 400);
  await page.getByLabel("Verbindungspunkttyp", { exact: true }).selectOption("terminal");
  await page.getByTitle("Leitung (L)").click();
  await page.mouse.click(box.x + 160, box.y + 250);
  await page.mouse.click(box.x + 510, box.y + 250);
  await page.mouse.click(box.x + 510, box.y + 400);
  await expect(page.getByLabel("Kabeltyp", { exact: true })).toHaveValue("Unbekannt");
  await field(page, "Kabeltyp", "NYM-J 3x1,5");
  await field(page, "Aderanzahl", "3");
  await field(page, "Leiterquerschnitt (mm²)", "1,5");
  await field(page, "Längenzuschlag", "1,5 m");
  const initial = await exported(page);
  const cable = Object.values(initial.electrical.cables)[0]!;
  expect(cable.path).toHaveLength(1);
  expect(cable.lengthAllowance).toBe(1500);
  expect(cable.conductorCrossSection).toBe(1.5);
  const a = initial.electrical.distributionBoards[cable.startNodeId]!,
    b = initial.electrical.junctions[cable.endNodeId]!;
  const expected = Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y);
  await expect(page.locator(".circuit-summary").filter({ hasText: "Planlänge:" })).toContainText(
    (expected / 1000).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
  );
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 510, box.y + 400);
  await page.mouse.down();
  await page.mouse.move(box.x + 545, box.y + 400, { steps: 5 });
  await page.mouse.up();
  const moved = await exported(page);
  expect(moved.electrical.junctions[b.id]!.position.x - b.position.x).toBe(500);
  expect(moved.electrical.cables[cable.id]).toEqual(cable);
  await page.keyboard.press("Delete");
  expect(Object.keys((await exported(page)).electrical.cables)).toHaveLength(0);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).electrical.cables[cable.id]).toEqual(cable);
  await page.getByTitle("Leitung (L)").click();
  await page.mouse.click(box.x + 160, box.y + 250);
  await page.mouse.click(box.x + 250, box.y + 300);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Escape");
  expect(Object.keys((await exported(page)).electrical.cables)).toHaveLength(1);
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "leitungen.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByText("„Mein Haus“ wurde importiert.")).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.screenshot({ path: "test-results/cables-desktop.png" });
  expect(errors).toEqual([]);
});

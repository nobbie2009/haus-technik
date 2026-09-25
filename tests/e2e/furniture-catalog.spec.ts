import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
async function exported(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Tabwechsel wählt Auswahl; Ziehen auf Freifläche verschiebt nur die Ansicht", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  for (const tab of ["Möbel", "Elektrik", "Netzwerk", "Grundstück", "Wasser / Wärme / Gas", "Haus / Raum"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(page.getByTitle("Auswahl (V)")).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByRole("button", { name: "Möbel im Plan platzieren", exact: true }).click();
  let box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 300, box.y + 220);
  const before = await exported(page);
  const first = Object.values(before.furniture)[0]!;
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.move(box.x + 600, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 670, box.y + 155, { steps: 6 });
  await page.mouse.up();
  expect((await exported(page)).furniture).toEqual(before.furniture);
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByRole("button", { name: "Möbel im Plan platzieren", exact: true }).click();
  box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 300, box.y + 220);
  const second = Object.values((await exported(page)).furniture).find((i) => i.id !== first.id)!;
  expect(second.position.x).toBeCloseTo(first.position.x - 1000);
  expect(second.position.y).toBeCloseTo(first.position.y + 500);
});
test("Globaler Möbelkatalog: Herstellermaße prüfen, speichern, platzieren und Datei importieren", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByRole("button", { name: "Globaler Möbelkatalog", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Globaler Möbelkatalog", exact: true });
  await dialog.getByLabel("Vorlagenname", { exact: true }).fill("Beispielregal");
  await dialog.getByLabel("Hersteller", { exact: true }).fill("Beispielhersteller");
  await dialog.getByLabel("Produktlink (optional)").fill("https://example.com/regal");
  await dialog.getByText("Maße von IKEA oder anderen Quellen übernehmen", { exact: true }).click();
  await dialog.getByLabel("Kopierte Produktmaße").fill("Breite: 80 cm\nTiefe: 28 cm\nHöhe: 202 cm");
  await dialog.getByRole("button", { name: "Maße vorschlagen", exact: true }).click();
  await expect(dialog.getByLabel("Breite (mm)", { exact: true })).toHaveValue("800");
  await expect(dialog.getByLabel("Tiefe (mm)", { exact: true })).toHaveValue("280");
  await expect(dialog.getByLabel("Höhe (mm)", { exact: true })).toHaveValue("2020");
  await dialog.getByRole("button", { name: "Vorlage speichern", exact: true }).click();
  await dialog.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/furniture-catalog.png" });
  const event = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Möbelkatalog exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  const data = Buffer.concat(chunks);
  await dialog.getByRole("button", { name: "Platzieren: Beispielregal", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 330, box.y + 260);
  const item = Object.values((await exported(page)).furniture)[0]!;
  expect(item).toMatchObject({
    name: "Beispielregal",
    width: 800,
    depth: 280,
    height: 2020,
    metadata: { productSource: "https://example.com/regal" },
  });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByRole("button", { name: "Globaler Möbelkatalog", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Globaler Möbelkatalog", exact: true });
  await expect(dialog.getByRole("button", { name: "Platzieren: Beispielregal", exact: true })).toBeVisible();
  await dialog
    .getByLabel("Möbelkatalog importieren (JSON)")
    .setInputFiles({ name: "catalog.json", mimeType: "application/json", buffer: data });
  await dialog.getByRole("button", { name: "Importierte Vorlagen übernehmen", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Platzieren: Beispielregal", exact: true })).toHaveCount(1);
});

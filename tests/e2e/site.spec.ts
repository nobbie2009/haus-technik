import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { site } from "../../src/site/model";
import { housebook } from "../../src/housebook/model";

async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Project;
}

test("Grundstück und Weg zeichnen, Referenzpunkt setzen und Router daran ausrichten", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Grundstück", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  for (const [x, y] of [
    [160, 200],
    [480, 200],
    [480, 450],
    [160, 450],
  ])
    await page.mouse.click(box.x + x!, box.y + y!);
  await page.getByRole("button", { name: "Zeichnung abschließen", exact: true }).click();
  await expect(page.getByLabel("Außenobjektname", { exact: true })).toHaveValue("Grundstücksgrenze 1");
  const boundary = Object.values(site(await exported(page)).elements)[0]!;
  expect(boundary.vertices).toHaveLength(4);
  await page.getByLabel("Bezugspunkt", { exact: true }).selectOption(`${boundary.id}:0`);
  await page.getByLabel("Versatz X", { exact: true }).fill("1 m");
  await page.getByLabel("Versatz X", { exact: true }).press("Enter");
  await page.getByLabel("Versatz Y", { exact: true }).fill("-1 m");
  await page.getByLabel("Versatz Y", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Referenzpunkt mit Abstand setzen", exact: true }).click();
  const reference = Object.values(site(await exported(page)).elements).find((e) => e.kind === "reference")!;
  expect(reference.vertices[0]).toEqual({
    x: boundary.vertices[0]!.x + 1000,
    y: boundary.vertices[0]!.y - 1000,
  });
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.mouse.click(box.x + 232, box.y + 271);
  expect(housebook(await exported(page)).networkNodes[0]!.position).toEqual(reference.vertices[0]);
  await page.getByRole("tab", { name: "Grundstück", exact: true }).click();
  await page.getByLabel("Außenobjekt", { exact: true }).selectOption("path");
  await page.getByLabel("Wegbreite (Vorlage)", { exact: true }).fill("1,2 m");
  await page.getByLabel("Wegbreite (Vorlage)", { exact: true }).press("Enter");
  for (const [x, y] of [
    [200, 360],
    [310, 360],
    [400, 400],
  ])
    await page.mouse.click(box.x + x!, box.y + y!);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Außenobjektname", { exact: true })).toHaveValue("Weg 1");
  const path = Object.values(site(await exported(page)).elements).find((e) => e.kind === "path")!;
  expect(path.width).toBe(1200);
  expect(path.vertices).toHaveLength(3);
  await page.getByRole("button", { name: "Grundstück sperren", exact: true }).click();
  await expect(page.getByLabel("Punkt X", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Grundstück entsperren", exact: true }).click();
  await page.getByRole("button", { name: "Löschen", exact: true }).click();
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect(Object.values(site(await exported(page)).elements).some((e) => e.id === path.id)).toBe(true);
  await page.locator(".left-panel").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/site-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "test-results/site-compact.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(site(await exported(page))).toEqual(site(saved));
  expect(errors).toEqual([]);
});

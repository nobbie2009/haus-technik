import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
import { furnitureHandle } from "../../src/furniture/resize";
import { worldToScreen } from "../../src/geometry/coordinates";

async function exported(page: Page): Promise<Project> {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("Möbel mit Eck- und Seitengriffen skalieren, abbrechen und rückgängig machen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await page.getByRole("button", { name: "Möbel im Plan platzieren", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(box.x + 330, box.y + 270);
  await page.getByTitle("Auswahl (V)").click();
  const initial = Object.values((await exported(page)).furniture)[0]!;
  const viewport = { scale: 0.07, originPx: { x: 120, y: 480 } };
  const drag = async (
    item: typeof initial,
    handle: number,
    dx: number,
    dy: number,
    cancel: false | "escape" | "blur" = false,
  ) => {
    const p = worldToScreen(furnitureHandle(item, handle), viewport);
    await page.mouse.move(box.x + p.x, box.y + p.y);
    await page.mouse.down();
    await page.mouse.move(box.x + p.x + dx, box.y + p.y + dy, { steps: 8 });
    if (cancel === "escape") await page.keyboard.press("Escape");
    if (cancel === "blur") await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.mouse.up();
  };
  await drag(initial, 4, 70, -35);
  const resized = (await exported(page)).furniture[initial.id]!;
  expect(resized.width).toBe(initial.width + 1000);
  expect(resized.depth).toBe(initial.depth + 500);
  expect(furnitureHandle(resized, 0)).toEqual(furnitureHandle(initial, 0));
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).furniture[initial.id]).toEqual(initial);
  await drag(initial, 3, 50, 0, "escape");
  expect((await exported(page)).furniture[initial.id]).toEqual(initial);
  await drag(initial, 3, 50, 0, "blur");
  expect((await exported(page)).furniture[initial.id]).toEqual(initial);
  await page.getByLabel("Drehung (°)", { exact: true }).fill("45");
  await page.getByLabel("Drehung (°)", { exact: true }).press("Enter");
  const rotated = (await exported(page)).furniture[initial.id]!;
  await drag(rotated, 3, 70 / Math.SQRT2, -70 / Math.SQRT2);
  const after = (await exported(page)).furniture[initial.id]!;
  expect(after.width).toBe(rotated.width + 1000);
  expect(after.depth).toBe(rotated.depth);
  expect(after.rotation).toBe(rotated.rotation);
  const fixed = furnitureHandle(after, 7),
    before = furnitureHandle(rotated, 7);
  expect(fixed.x).toBeCloseTo(before.x);
  expect(fixed.y).toBeCloseTo(before.y);
  await page.screenshot({ path: "test-results/furniture-resize.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect((await exported(page)).furniture[initial.id]).toEqual(after);
});

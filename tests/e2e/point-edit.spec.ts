import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("Raumecke einzeln ziehen, rückgängig machen und per Koordinate bearbeiten", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.getByTitle("Rechteckraum (R)").click();
  await page.mouse.click(box.x + 160, box.y + 200);
  await page.mouse.click(box.x + 510, box.y + 440);
  const before = await exported(page),
    room = Object.values(before.rooms)[0]!;
  await page.getByTitle("Auswahl (V)").click();
  await page.mouse.move(box.x + 160, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 195, box.y + 214, { steps: 5 });
  await page.mouse.up();
  const after = await exported(page),
    changed = Object.values(before.points).filter(
      (p) => JSON.stringify(p.position) !== JSON.stringify(after.points[p.id]!.position),
    );
  expect(changed).toHaveLength(1);
  const id = changed[0]!.id;
  expect(after.points[id]!.position.x - before.points[id]!.position.x).toBe(500);
  expect(after.points[id]!.position.y - before.points[id]!.position.y).toBe(-200);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  expect((await exported(page)).points).toEqual(before.points);
  await page.mouse.click(box.x + 300, box.y + 320);
  await page
    .getByLabel("Raumeckpunkt", { exact: true })
    .selectOption(String(room.polygon.pointIds.indexOf(id)));
  await page.getByLabel("Ecke X", { exact: true }).fill(`${before.points[id]!.position.x + 300} mm`);
  await page.getByLabel("Ecke X", { exact: true }).press("Enter");
  const edited = await exported(page);
  for (const point of Object.values(before.points))
    if (point.id !== id) expect(edited.points[point.id]).toEqual(point);
  expect(edited.points[id]!.position.x).toBe(before.points[id]!.position.x + 300);
  expect(errors).toEqual([]);
});

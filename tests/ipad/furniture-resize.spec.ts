import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";

async function furniture(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(Buffer.from(chunk));
  return Object.values((JSON.parse(Buffer.concat(chunks).toString()) as Project).furniture)[0]!;
}

test("Möbelgröße per Touch ziehen; Abbruch und zweiter Finger verwerfen die Vorschau", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).tap();
  await page.getByRole("button", { name: "Menüband", exact: true }).tap();
  const surface = page.getByTestId("drawing-surface");
  const box = (await surface.boundingBox())!;
  await page.touchscreen.tap(box.x + 330, box.y + 270);
  await page.getByRole("button", { name: "Auswählen", exact: true }).tap();
  const initial = await furniture(page);
  const gesture = async (mode: "resize" | "cancel" | "pinch") => {
    // WebKit bietet keine native API für Touch-Ziehgesten: derselbe Pointer-Pfad wie im Editor.
    await surface.evaluate((element, mode) => {
      const host = element as HTMLElement;
      host.setPointerCapture = () => {};
      const r = host.getBoundingClientRect();
      const send = (type: string, id: number, x: number, y: number) =>
        host.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerType: "touch",
            pointerId: id,
            button: 0,
            clientX: r.x + x,
            clientY: r.y + y,
          }),
        );
      send("pointerdown", 1, 407, 270);
      send("pointermove", 1, 442, 270);
      if (mode === "cancel") send("pointercancel", 1, 442, 270);
      if (mode === "pinch") {
        send("pointerdown", 2, 200, 200);
        send("pointermove", 2, 180, 180);
        send("pointerup", 2, 180, 180);
      }
      send("pointerup", 1, 442, 270);
    }, mode);
  };
  await gesture("resize");
  const resized = await furniture(page);
  expect(resized.width).toBe(initial.width + 500);
  expect(resized.depth).toBe(initial.depth);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).tap();
  expect(await furniture(page)).toEqual(initial);
  await gesture("cancel");
  expect(await furniture(page)).toEqual(initial);
  await gesture("pinch");
  expect(await furniture(page)).toEqual(initial);
});

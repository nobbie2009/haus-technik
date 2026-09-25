import { test, expect, type Page } from "@playwright/test";
import type { Project } from "../../src/models/project";
async function furniture(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(Buffer.from(chunk));
  return (JSON.parse(Buffer.concat(chunks).toString()) as Project).furniture;
}
test("Ein Finger verschiebt auf freier Fläche die Ansicht, nicht den Plan", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).tap();
  await page.getByRole("button", { name: "Möbel im Plan platzieren", exact: true }).tap();
  const surface = page.getByTestId("drawing-surface");
  const box = (await surface.boundingBox())!;
  await page.touchscreen.tap(box.x + 300, box.y + 220);
  const before = await furniture(page);
  const first = Object.values(before)[0]!;
  await page.getByTitle("Auswahl (V)").tap();
  // WebKit has no native touch-drag API; exercise the same pointer path as a touch device.
  await surface.evaluate((element) => {
    const host = element as HTMLElement;
    const capture = host.setPointerCapture;
    host.setPointerCapture = () => {};
    const box = host.getBoundingClientRect();
    for (const [type, x, y] of [
      ["pointerdown", 650, 120],
      ["pointermove", 720, 155],
      ["pointerup", 720, 155],
    ] as const)
      host.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: "touch",
          pointerId: 51,
          button: 0,
          clientX: box.x + x,
          clientY: box.y + y,
        }),
      );
    host.setPointerCapture = capture;
  });
  expect(await furniture(page)).toEqual(before);
  await page.getByRole("button", { name: "Möbel im Plan platzieren", exact: true }).tap();
  await page.touchscreen.tap(box.x + 300, box.y + 220);
  const second = Object.values(await furniture(page)).find((i) => i.id !== first.id)!;
  expect(second.position.x).toBeCloseTo(first.position.x - 1000);
  expect(second.position.y).toBeCloseTo(first.position.y + 500);
});

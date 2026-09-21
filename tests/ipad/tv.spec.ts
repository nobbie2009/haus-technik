import { test, expect } from "@playwright/test";
import { createProject } from "../../src/core/projectFactory";
import { addNetworkNode } from "../../src/network/model";
import { housebook, setHousebook } from "../../src/housebook/model";
import { newId } from "../../src/utils/uuid";

test("Koaxweg auf dem iPad per Finger setzen und speichern", async ({ page }) => {
  const p = createProject();
  const a = addNetworkNode(p, p.floorOrder[0]!, { x: 0, y: 0 }, "satDish");
  const b = addNetworkNode(p, p.floorOrder[0]!, { x: 3000, y: 1000 }, "multiswitch");
  const book = housebook(p);
  book.networkLinks.push({
    id: newId(),
    from: a,
    to: b,
    fromPort: 1,
    toPort: 1,
    name: "SAT-Test",
    cableType: "Koax 75 Ohm",
    medium: "coax",
    allowance: 0,
  });
  setHousebook(p, book);
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "sat.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).tap();
  await page.getByRole("button", { name: "TV / SAT & Koaxleitungen", exact: true }).tap();
  await page.getByRole("button", { name: "Leitungsweg zeichnen", exact: true }).tap();
  await page.getByRole("button", { name: "Werkzeuge", exact: true }).tap();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.touchscreen.tap(box.x + 250, box.y + 200);
  await page.touchscreen.tap(box.x + 450, box.y + 200);
  await page.getByRole("button", { name: "Koaxweg speichern", exact: true }).tap();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).tap();
  const chunks: Buffer[] = [];
  for await (const c of await (await event).createReadStream()) chunks.push(Buffer.from(c));
  const result = housebook(JSON.parse(Buffer.concat(chunks).toString()));
  expect(result.networkLinks[0]!.path).toHaveLength(2);
  expect(result.networkLinks[0]!.from).toBe(a);
  expect(result.networkLinks[0]!.to).toBe(b);
  await page.screenshot({ path: "test-results/tv-ipad.png" });
});

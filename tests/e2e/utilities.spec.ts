import { test, expect, type Page } from "@playwright/test";
import { utilities, addUtilityNode, pipeLength } from "../../src/utilities/model";
import { createProject } from "../../src/core/projectFactory";
import { newId } from "../../src/utils/uuid";
import type { Project } from "../../src/models/project";
async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const stream = await (await pending).createReadStream(),
    chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}

test("Etagenleitung per Anschlussauswahl erstellen und Steigpunkt bearbeiten", async ({ page }) => {
  const project = createProject(),
    floor = project.floorOrder[0]!,
    upper = newId();
  project.floors[upper] = { ...project.floors[floor]!, id: upper, name: "Obergeschoss", elevation: 2800 };
  project.floorOrder.push(upper);
  const a = addUtilityNode(project, floor, { x: 0, y: 0 }, "source", "cold");
  const b = addUtilityNode(project, upper, { x: 3000, y: 0 }, "tap", "cold");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "wasser.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true }).click();
  await page.getByText("Anschlüsse verbinden / Etagenleitung", { exact: true }).click();
  await page.getByLabel("Rohr von", { exact: true }).selectOption(a);
  await page.getByLabel("Rohr nach", { exact: true }).selectOption(b);
  await page.getByRole("button", { name: "Rohrverbindung erstellen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Steigpunkt", exact: true })).toBeVisible();
  await page.getByLabel("Steigpunkt X", { exact: true }).fill("1 m");
  await page.getByLabel("Steigpunkt X", { exact: true }).press("Enter");
  const saved = await exported(page),
    pipe = Object.values(utilities(saved).pipes)[0]!;
  expect(pipe.riser).toEqual({ x: 1000, y: 0 });
  expect(pipeLength(saved, pipe)).toBe(5800);
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.getByRole("button", { name: "Obergeschoss", exact: true }).click();
  await page.getByText("Objekte im aktiven Bereich").click();
  await page.getByRole("button", { name: "KW-1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Steigpunkt", exact: true })).toBeVisible();
});
test("Wasser, Heizung und Gas platzieren, verbinden, bearbeiten und wieder laden", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Wasser / Wärme / Gas", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  const place = async (kind: string, medium: string, x: number, y: number, name: string) => {
    await page.getByLabel("Leitungsmedium", { exact: true }).selectOption(medium);
    await page.getByLabel("Komponentenart", { exact: true }).selectOption(kind);
    await page.getByRole("button", { name: "Komponente platzieren", exact: true }).click();
    await page.mouse.click(box.x + x, box.y + y);
    await page.getByLabel("Rohrnetz-Name", { exact: true }).fill(name);
    await page.getByLabel("Rohrnetz-Name", { exact: true }).press("Enter");
  };
  await place("source", "cold", 120, 280, "Wasseranschluss");
  await place("tap", "cold", 400, 280, "Küchenspüle");
  await page.getByRole("button", { name: "Rohrleitung zeichnen", exact: true }).click();
  await page.mouse.click(box.x + 120, box.y + 280);
  await page.mouse.click(box.x + 120, box.y + 360);
  await page.mouse.click(box.x + 400, box.y + 280);
  await page.getByLabel("Rohrmaterial", { exact: true }).fill("Mehrschichtverbund");
  await page.getByLabel("Rohrmaterial", { exact: true }).press("Enter");
  await page.getByLabel("Nennweite (DN)", { exact: true }).fill("20");
  await page.getByLabel("Nennweite (DN)", { exact: true }).press("Enter");
  await place("gasBoiler", "flow", 120, 500, "Gasheizung Keller");
  await place("radiator", "flow", 400, 500, "Heizkörper Küche");
  await page.getByLabel("Heizleistung (W)", { exact: true }).fill("1200");
  await page.getByLabel("Heizleistung (W)", { exact: true }).press("Enter");
  for (const medium of ["flow", "return"]) {
    await page.getByLabel("Leitungsmedium", { exact: true }).selectOption(medium);
    await page.getByRole("button", { name: "Rohrleitung zeichnen", exact: true }).click();
    await page.mouse.click(box.x + 120, box.y + 500);
    await page.mouse.click(box.x + 270, box.y + (medium === "flow" ? 460 : 550));
    await page.mouse.click(box.x + 400, box.y + 500);
  }
  await place("source", "gas", 120, box.height - 45, "Gasanschluss");
  await page.getByRole("button", { name: "Rohrleitung zeichnen", exact: true }).click();
  await page.mouse.click(box.x + 120, box.y + box.height - 45);
  await page.mouse.click(box.x + 120, box.y + 500);
  const p = await exported(page),
    net = utilities(p);
  expect(Object.values(net.nodes)).toHaveLength(5);
  expect(
    Object.values(net.pipes)
      .map((p) => p.medium)
      .sort(),
  ).toEqual(["cold", "flow", "gas", "return"]);
  expect(Object.values(net.pipes).find((p) => p.medium === "cold")).toMatchObject({
    material: "Mehrschichtverbund",
    nominalDiameter: 20,
  });
  await page.screenshot({ path: "test-results/utilities-desktop.png" });
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Neu", exact: true })).toBeEnabled();
  expect(utilities(await exported(page))).toEqual(net);
  expect(errors).toEqual([]);
});

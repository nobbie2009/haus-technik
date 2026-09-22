import { test, expect } from "@playwright/test";
import { distributionFixture } from "../electrical/distributionFixture";
import { addNetworkNode } from "../../src/network/model";
import type { Project } from "../../src/models/project";

test("Netzwerkgerät direkt im allgemeinen Anschlussdialog auswählen", async ({ page }) => {
  const { project, outlet, upper } = distributionFixture();
  const node = addNetworkNode(project, upper.id, { x: 1000, y: 500 }, "router");
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  await page.getByRole("button", { name: "Anschlussdialog öffnen", exact: true }).click();
  await page.getByLabel("Startobjekt", { exact: true }).selectOption(outlet);
  await page.getByLabel("Zielobjekt", { exact: true }).selectOption(`network:${node}`);
  await expect(page.getByLabel("Verbindung 1 · Zielkontakt", { exact: true })).toHaveValue("L");
  await expect(page.locator(".automatic-contact summary")).toHaveText([
    "N → N · vorbelegt · bei Bedarf bearbeiten",
  ]);
  await page.getByRole("button", { name: "Verbinden und zuordnen", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Anschlüsse verbinden", exact: true })).toHaveCount(0);
});

test("Router an Steckdose anschließen: automatische Kontakte, Zuordnung und Wiederladen", async ({
  page,
}) => {
  const { project, outlet, upper } = distributionFixture();
  const node = addNetworkNode(project, upper.id, { x: 1000, y: 500 }, "router");
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "beispiel.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByTitle("Geschosse verwalten", { exact: true }).click();
  await page.locator(".floor-item").filter({ hasText: "Obergeschoss" }).click();
  if (await page.getByRole("button", { name: "Eigenschaften", exact: true }).isVisible())
    await page.getByRole("button", { name: "Eigenschaften", exact: true }).click();
  await page.locator(".object-list summary").click();
  await page.locator(".object-list").getByRole("button", { name: "Router 1", exact: true }).click();
  await page.getByRole("button", { name: "Mit Steckdose verbinden", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Anschlüsse verbinden", exact: true });
  await dialog.getByLabel("Zielobjekt", { exact: true }).selectOption(outlet);
  await expect(dialog.getByLabel("Verbindung 1 · Startkontakt", { exact: true })).toHaveValue("L");
  await expect(dialog.locator(".automatic-contact summary")).toHaveText([
    "N → N · vorbelegt · bei Bedarf bearbeiten",
  ]);
  await expect(
    dialog.getByRole("checkbox", { name: "Verbraucher dieser Steckdose zuordnen (Simulation)", exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Verbinden und zuordnen", exact: true }).click();
  await expect(
    page.getByText(`Steckdose: ${project.electrical.outlets[outlet]!.label}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stromanschluss konfigurieren", exact: true }).click();
  await page.getByRole("checkbox", { name: "PE-Anschluss vorhanden", exact: true }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByRole("button", { name: "Mit Steckdose verbinden", exact: true }).click();
  await dialog.getByRole("button", { name: "Kontaktvorschläge übernehmen", exact: true }).click();
  await expect(dialog.locator(".automatic-contact summary")).toHaveText([
    "N → N · vorbelegt · bei Bedarf bearbeiten",
    "PE → PE · vorbelegt · bei Bedarf bearbeiten",
  ]);
  await page.setViewportSize({ width: 1440, height: 1400 });
  await dialog.screenshot({ path: "test-results/network-power-contacts.png" });
  await dialog.getByRole("button", { name: "Verbinden und zuordnen", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON exportieren", exact: true }).click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const saved = JSON.parse(Buffer.concat(chunks).toString()) as Project;
  const power = Object.values(saved.electrical.devices).find((d) => d.metadata.networkNodeId === node)!;
  expect(power.connectionPointId).toBe(outlet);
  expect(Object.values(saved.electrical.cables)).toHaveLength(1);
  expect(Object.values(saved.electrical.cables)[0]!.conductorConnections).toHaveLength(3);
});

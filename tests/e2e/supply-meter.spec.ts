import { homeBook } from "../../src/housebook/home";
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
async function selectObject(page: Page, name: string) {
  const list = page.locator(".object-list");
  if (!(await list.getAttribute("open"))) {
    // Ein offenes <details> hat ein leeres open-Attribut.
    if (!(await list.evaluate((element) => (element as HTMLDetailsElement).open)))
      await list.locator("summary").click();
  }
  await list.getByRole("button", { name, exact: true }).click();
}

test("Einspeisung, Stromzähler, Sicherungskasten und Steckdose übernehmen Vorgaben und Schutzzuordnung", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Elektrik", exact: true }).click();
  const box = (await page.getByTestId("drawing-surface").boundingBox())!;
  const place = async (kind: string, x: number) => {
    await page.getByLabel("Elektroobjekt", { exact: true }).selectOption(kind);
    await page.mouse.click(box.x + x, box.y + 300);
  };
  await place("outlets", 500);
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("230 V");
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("Unbekannt");
  await place("supplies", 160);
  await expect(page.getByLabel("Einspeisespannung L–N (V)", { exact: true })).toHaveValue("230");
  await field(page, "Anschlusskapazität je Phase (A)", "63");
  await place("meters", 260);
  await page
    .getByLabel("Einspeisepunkt des Zählers", { exact: true })
    .selectOption({ label: "NETZ-01 · Stromeinspeisung" });
  await field(page, "Zählernummer", "1-ABC-987654");
  await page.getByRole("button", { name: "Zählerstände / Hausakte öffnen", exact: true }).click();
  await page.getByLabel("Ablesedatum", { exact: true }).fill("2026-09-21");
  await page.getByLabel("Zählerstand (kWh)", { exact: true }).fill("12345.67");
  await page.getByRole("button", { name: "Ablesung speichern", exact: true }).click();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByRole("region", { name: "Verknüpfte Zählerakte" })).toContainText("12.345,67 kWh");
  await page.screenshot({ path: "test-results/meter-desktop.png" });
  await place("distributionBoards", 360);
  await page
    .getByLabel("Versorgung des Sicherungskastens", { exact: true })
    .selectOption({ label: "Z-01 · Stromzähler" });
  await page.getByRole("button", { name: "FI hinzufügen", exact: true }).click();
  await field(page, "Bemessungsstrom (A)", "40");
  await field(page, "Bemessungsdifferenzstrom (mA)", "30");
  await page.getByRole("button", { name: "B16-Sicherung hinzufügen", exact: true }).click();
  await expect(page.getByLabel("Bemessungsstrom (A)", { exact: true })).toHaveValue("16");
  await page.getByLabel("Vorgeschaltetes Schutzgerät", { exact: true }).selectOption({ label: "F1 · RCD" });
  const data = await exported(page);
  const ls = Object.values(data.electrical.protectionDevices).find((item) => item.type === "MCB")!;
  const manage = async () =>
    page.locator(".right-panel").getByRole("button", { name: "Stromkreise verwalten", exact: true }).click();
  await manage();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Neuer Stromkreis", exact: true }).click();
  await page.getByLabel("Schutzgerät", { exact: true }).selectOption(ls.id);
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByLabel("Sicherung für SK-01", { exact: true })).toHaveValue(ls.id);
  await selectObject(page, "Steckdose");
  const circuit = Object.values((await exported(page)).electrical.circuits)[0]!;
  await page.getByLabel("Stromkreis", { exact: true }).selectOption(circuit.id);
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("230 V");
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("16 A");
  await expect(page.getByRole("region", { name: "Geplante Versorgung" })).toContainText(
    "Z-01 → UV-01 → F1 → F2 → SK-01",
  );
  await page.getByRole("button", { name: "Elektrik-Projektstandard", exact: true }).click();
  await field(page, "Standardspannung L–N (V)", "240");
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("240 V");
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("230 V");
  await page.getByRole("button", { name: "Wiederholen", exact: true }).click();
  await selectObject(page, "Stromeinspeisung");
  await field(page, "Einspeisespannung L–N (V)", "220");
  await selectObject(page, "Sicherungskasten");
  await page.getByLabel("Schutzgerät im Kasten bearbeiten", { exact: true }).selectOption(ls.id);
  await field(page, "Bemessungsstrom (A)", "10");
  await page.screenshot({ path: "test-results/board-desktop.png" });
  await selectObject(page, "Steckdose");
  await expect(page.getByLabel("Versorgungsspannung", { exact: true })).toHaveText("220 V");
  await expect(page.getByLabel("Stromkreisabsicherung", { exact: true })).toHaveText("10 A");
  await page.locator(".right-panel").evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/supply-outlet-desktop.png" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "test-results/supply-outlet-compact.png" });
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Elektrik sperren", exact: true }).click();

  await page.getByRole("button", { name: "Elektrik-Projektstandard", exact: true }).click();
  await expect(page.getByLabel("Standardspannung L–N (V)", { exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await page.getByRole("button", { name: "Ebenen", exact: true }).click();
  await page.getByRole("button", { name: "Elektrik entsperren", exact: true }).click();

  // Der ausgewählte Kasten muss neue Stromkreise erhalten, nicht immer der erste Kasten.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await place("distributionBoards", 620);
  await field(page, "Elektro-Name", "Oberverteilung");
  await manage();
  await dialog.getByRole("button", { name: "Neuer Stromkreis", exact: true }).click();
  const boardId = await page.getByLabel("Verteilerzuordnung", { exact: true }).inputValue();
  await expect(page.getByLabel("Sicherungskasten", { exact: true })).toHaveValue(boardId);
  const firstBoard = Object.keys(data.electrical.distributionBoards)[0]!;
  expect(boardId).not.toBe(firstBoard);
  await page.getByLabel("Verteilerzuordnung", { exact: true }).selectOption(firstBoard);
  await expect(page.getByLabel("Sicherungskasten", { exact: true })).toHaveValue(firstBoard);
  await expect(page.getByLabel("Stromkreiskennzeichnung", { exact: true })).toHaveValue("SK-02");
  await dialog.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await selectObject(page, "Stromzähler");
  await page.getByTitle("Auswahl (V)").click();
  await page.getByTestId("drawing-surface").focus();
  await page.keyboard.press("Delete");
  expect(Object.keys((await exported(page)).electrical.meters)).toHaveLength(0);
  await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  const saved = await exported(page);
  expect(homeBook(saved).meters[0]!.readings[0]!.value).toBe(12345.67);
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  await page.getByLabel("Projektdatei importieren").setInputFiles({
    name: "versorgung.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByText("„Mein Haus“ wurde importiert.")).toBeVisible();
  expect(await exported(page)).toEqual(saved);
  expect(errors).toEqual([]);
});

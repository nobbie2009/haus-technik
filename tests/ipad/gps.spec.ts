import { test, expect, type Page } from "@playwright/test";
import { site } from "../../src/site/model";
import { gpsReference } from "../../src/site/gps";
import type { Project } from "../../src/models/project";
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
type GpsTest = {
  emit: (latitude: number, longitude: number, accuracy: number, age: number) => void;
  fail: (code: number) => void;
  count: () => number;
};
async function setup(page: Page) {
  await page.addInitScript(() => {
    let next = 1;
    const watchers = new Map<number, { ok: PositionCallback; fail: PositionErrorCallback | null }>();
    const api = {
      watchPosition: (ok: PositionCallback, fail?: PositionErrorCallback | null) => {
        const id = next++;
        watchers.set(id, { ok, fail: fail ?? null });
        return id;
      },
      clearWatch: (id: number) => watchers.delete(id),
    };
    Object.defineProperty(navigator, "geolocation", { value: api, configurable: true });
    (window as unknown as { gpsTest: GpsTest }).gpsTest = {
      emit: (latitude, longitude, accuracy, age) => {
        for (const cb of watchers.values())
          cb.ok({
            coords: {
              latitude,
              longitude,
              accuracy,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now() - age,
          } as GeolocationPosition);
      },
      fail: (code) => {
        for (const cb of [...watchers.values()])
          cb.fail?.({ code, message: "Test" } as GeolocationPositionError);
      },
      count: () => watchers.size,
    };
  });
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Menüband", exact: true }).click();
  await page.getByRole("tab", { name: "Grundstück", exact: true }).click();
  await page.getByRole("button", { name: "Per GPS erfassen", exact: true }).click();
}
async function emit(page: Page, latitude = 0, longitude = 0, accuracy = 3, age = 0) {
  await page.evaluate(
    ({ latitude, longitude, accuracy, age }) =>
      (window as unknown as { gpsTest: GpsTest }).gpsTest.emit(latitude, longitude, accuracy, age),
    { latitude, longitude, accuracy, age },
  );
}
async function exported(page: Page): Promise<Project> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON exportieren", exact: true }).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await pending).createReadStream()) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString());
}
test("GPS auf dem iPhone: Referenz, Grenze, Weg und Speicherung", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.count()))
    .toBe(0);
  await page.getByRole("button", { name: "Ortung starten", exact: true }).click();
  await emit(page);
  await page.getByRole("button", { name: "Aktuellen Standort als GPS-Referenz setzen", exact: true }).click();
  const capture = async (lat: number, lon: number) => {
    await emit(page, lat, lon);
    await page.getByRole("button", { name: "Position prüfen", exact: true }).click();
    await page.getByRole("button", { name: "Punkt übernehmen", exact: true }).click();
  };
  await capture(0, 0);
  await capture(0, 0.0002);
  await capture(0.0001, 0.0002);
  await capture(0.0001, 0);
  await expect(page.getByText("4 Punkte aufgenommen", { exact: true })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Grundstück per GPS erfassen" });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.getByRole("heading", { name: "2. Punkte aufnehmen" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/gps-iphone.png" });
  await page.getByRole("button", { name: "GPS-Objekt speichern", exact: true }).click();
  await expect(page.getByText(/Grundstücksgrenze gespeichert/)).toBeVisible();
  await page.getByLabel("GPS-Außenobjekt", { exact: true }).selectOption("path");
  await page.getByLabel("GPS-Wegbreite", { exact: true }).fill("1.5 m");
  await capture(0, 0);
  await capture(0.0001, 0);
  await page.getByRole("button", { name: "GPS-Objekt speichern", exact: true }).click();
  await page.getByLabel("GPS-Außenobjekt", { exact: true }).selectOption("reference");
  await capture(0.00005, 0.00005);
  await page.getByRole("button", { name: "GPS-Objekt speichern", exact: true }).click();
  await page.getByRole("button", { name: "Dialog schließen", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.count()))
    .toBe(0);
  await page.getByRole("button", { name: "Menüband", exact: true }).click();
  const saved = await exported(page),
    elements = Object.values(site(saved).elements);
  expect(elements).toHaveLength(3);
  expect(elements[0]!.vertices).toHaveLength(4);
  expect(elements[1]!.width).toBe(1500);
  expect(elements[0]!.metadata.gpsSurvey).toBeDefined();
  expect(gpsReference(saved, saved.floorOrder[0]!)).not.toBeNull();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  expect(site(await exported(page))).toEqual(site(saved));
  expect(errors).toEqual([]);
});
test("GPS sperrt alte und ungenaue Messungen und behandelt verweigerte Freigabe", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Ortung starten", exact: true }).click();
  const reference = page.getByRole("button", {
    name: "Aktuellen Standort als GPS-Referenz setzen",
    exact: true,
  });
  await emit(page, 0, 0, 3, 20000);
  await expect(reference).toBeDisabled();
  await emit(page, 0, 0, 30);
  await expect(reference).toBeDisabled();
  await page.getByLabel("Messungen mit mehr als 10 m Ungenauigkeit zulassen").check();
  await expect(reference).toBeEnabled();
  await reference.click();
  await page.getByRole("button", { name: "Position prüfen", exact: true }).click();
  await page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.fail(1));
  await expect(page.getByRole("alert")).toContainText("Standortzugriff abgelehnt");
  await expect(page.getByRole("button", { name: "Punkt übernehmen", exact: true })).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.count()))
    .toBe(0);
  await page.getByRole("button", { name: "Ortung starten", exact: true }).click();
  await emit(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("alert")).toContainText("Hintergrund pausiert");
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.count()))
    .toBe(0);
});
test("GPS erklärt die HTTPS-Voraussetzung ohne Standortabfrage", async ({ page }) => {
  await setup(page);
  await page.evaluate(() =>
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true }),
  );
  await page.getByRole("button", { name: "Ortung starten", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  expect(await page.evaluate(() => (window as unknown as { gpsTest: GpsTest }).gpsTest.count())).toBe(0);
});

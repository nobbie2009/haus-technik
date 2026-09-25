import { test, expect } from "@playwright/test";

test("Schwebende Zigbee-Übersicht zeigt Router, Batterien und Offline-Zeiten ohne den Plan zu blockieren", async ({
  page,
}) => {
  let publish: ((topic: string, payload: unknown, retained?: boolean) => void) | undefined;
  let scans = 0;
  await page.addInitScript(() =>
    localStorage.setItem(
      "home-technik.home-assistant.connection.v1",
      JSON.stringify({ url: "http://ha.example.test:8123", token: "fake-token" }),
    ),
  );
  await page.routeWebSocket("ws://ha.example.test:8123/api/websocket", (ws) => {
    publish = (topic, payload, retained = false) =>
      ws.send(
        JSON.stringify({
          id: 1,
          type: "event",
          event: { topic: `zigbee2mqtt/${topic}`, payload: JSON.stringify(payload), retain: retained },
        }),
      );
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === "auth") ws.send(JSON.stringify({ type: "auth_ok" }));
      if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong", id: msg.id }));
      if (msg.type === "call_service") scans++;
      if (msg.type === "mqtt/subscribe") {
        ws.send(JSON.stringify({ id: msg.id, type: "result", success: true, result: null }));
        publish!("bridge/devices", [
          { ieee_address: "0x0000000000000001", friendly_name: "Router Flur", type: "Router" },
          { ieee_address: "0x0000000000000002", friendly_name: "Sensor Keller", type: "EndDevice" },
          { ieee_address: "0x0000000000000003", friendly_name: "Sensor Garten", type: "EndDevice" },
        ]);
        publish!("Router Flur/availability", { state: "online" }, true);
        publish!("Sensor Keller", { battery: 15, last_seen: "2025-01-01T12:30:00Z" }, true);
        publish!("Sensor Keller/availability", { state: "offline" }, true);
      }
    });
    ws.send(JSON.stringify({ type: "auth_required" }));
  });
  await page.goto("/");
  await expect(page.getByText("Lokal gespeichert", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Netzwerk", exact: true }).click();
  await page.getByRole("button", { name: "Zigbee2MQTT · Geräte & Karte", exact: true }).click();
  const config = page.getByRole("dialog", { name: "Zigbee2MQTT im Hausplan", exact: true });
  await config.getByLabel("Anzeige aktualisieren", { exact: true }).selectOption("5");
  await config.getByRole("button", { name: "Geräte auslesen & Live starten", exact: true }).click();
  await expect(config.getByRole("button", { name: "Platzieren: Router Flur", exact: true })).toBeVisible();
  await config.getByRole("button", { name: "Platzieren: Router Flur", exact: true }).click();
  const surface = (await page.getByTestId("drawing-surface").boundingBox())!;
  await page.mouse.click(surface.x + 300, surface.y + 220);
  await page.getByRole("button", { name: "Zigbee-Übersicht", exact: true }).click();
  const overview = page.getByRole("dialog", { name: "Zigbee-Übersicht", exact: true });
  await expect(overview).toHaveAttribute("aria-modal", "false");
  await expect(overview.getByText("Router (1)", { exact: true })).toBeVisible();
  await expect(overview.getByText("Batterie niedrig (1)", { exact: true })).toBeVisible({ timeout: 12000 });
  await expect(overview.getByText("Nicht erreichbar (Z2M) (1)", { exact: true })).toBeVisible();
  await expect(overview.getByText("Erreichbarkeit unbekannt (1)", { exact: true })).toBeVisible();
  await expect(
    overview.getByText(/Ausfallbeginn unbekannt \(gespeicherte Offline-Meldung\)/).first(),
  ).toBeVisible();
  await expect(overview.getByText(/Letzte Zigbee-Nachricht \(Z2M\): 1.1.2025/).first()).toBeVisible();
  await page.getByRole("tab", { name: "Möbel", exact: true }).click();
  await expect(overview).toBeVisible();
  await expect(page.getByTitle("Auswahl (V)")).toHaveAttribute("aria-pressed", "true");
  await overview.getByRole("button", { name: "Im Plan zeigen: Router Flur", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Netzwerk", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const before = (await overview.boundingBox())!;
  const handle = overview.getByRole("button", { name: "Zigbee-Übersicht verschieben", exact: true });
  await handle.focus();
  await handle.press("ArrowLeft");
  expect((await overview.boundingBox())!.x).toBeCloseTo(Math.max(8, before.x - 20));
  const handleBox = (await handle.boundingBox())!;
  await page.mouse.move(handleBox.x + 40, handleBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(handleBox.x - 20, handleBox.y + 20, { steps: 4 });
  await page.mouse.up();
  expect((await overview.boundingBox())!.x).toBeCloseTo(Math.max(8, before.x - 80));
  await page.screenshot({ path: "test-results/zigbee-overview.png" });
  await overview.getByLabel("Batteriewarnung bis einschließlich").selectOption("10");
  await expect(overview.getByText("Batterie niedrig (0)", { exact: true })).toBeVisible();
  publish!("Sensor Keller/availability", { state: "online" });
  await expect(overview.getByText("Nicht erreichbar (Z2M) (0)", { exact: true })).toBeVisible({
    timeout: 12000,
  });
  await overview.getByRole("button", { name: "Empfang stoppen", exact: true }).click();
  await expect(overview.getByRole("status")).toContainText("Empfang nicht aktiv");
  await overview.getByRole("button", { name: "Übersicht einklappen", exact: true }).click();
  await expect(overview.getByLabel("Geräte filtern")).not.toBeVisible();
  await overview.getByRole("button", { name: "Übersicht aufklappen", exact: true }).click();
  await overview.getByRole("button", { name: "Zigbee-Übersicht schließen", exact: true }).click();
  await expect(overview).toHaveCount(0);
  expect(scans).toBe(0);
});
